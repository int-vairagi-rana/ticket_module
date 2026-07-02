import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  CacheManager,
  ConflictError,
  InternalServerError,
  isAuthorized,
  logger,
  NotFoundError,
  responseHandler,
  sendEmail,
  validateRequest,
  isAuthenticated,
  UserRole,
} from "intellisolar-common";
import type { PlantRow, TicketRow } from "../../../interface";
import type {UserRow} from "intellisolar-common";
import { Plant, Ticket, User } from "../../../models";
import { createTicketForChatbootValidation } from "./create-ticket-for-chatboot.validation";
import { getAssignmentEmail } from "../../../utils";
import type{ TicketStatus , TicketSource ,TicketPriority } from "../../../enums";

const router = express.Router();

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : value);

router.post(
  "/v1/chatboot/ticket",
  responseHandler,
  isAuthenticated,
  isAuthorized("create-ticket"),
  createTicketForChatbootValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        email,
        phone_number,
        plant_id: plantId,
        title,
        description,
        status,
        source,
        priority,
        attachment_ids = {},
        created_by,
      } = req.body as Record<string,unknown>;


      const createdByUser = await CacheManager.getOrSet<UserRow>({
        key: `user:${created_by as string}`,
        fetcher: async () => {
          const user = await User.findOne<UserRow>({
            where: { id: created_by , is_active:true },
            select: ["id", "role", "plant_ids"],
          });
          if (!user) {
            throw new NotFoundError("User not found for the provided created_by id.");
          }
          return user ;
      }
      });

      const plant = await CacheManager.getOrSet<PlantRow>({
        key: `plant:${plantId as string}`,
        fetcher: async () => {
          const plant = await Plant.findOne<PlantRow>({
            where: { id: plantId },
            select: ["id", "contact_person_email", "contact_person_name", "plant_name"],
          });
          if (!plant) {
            throw new NotFoundError("Plant not found.");
          }
          return plant;
        }
      });


      if (createdByUser.role === ( UserRole.User as string ) ) {
        const userPlantIds = createdByUser.plant_ids ?? [];
        if (!userPlantIds.includes(plant.id)) {
          throw new AuthorizationError("You are not authorized to create a ticket for this plant.");
        }
      }

       if(createdByUser.role === (UserRole.Tenant as string)){
        if(plant.tenant_id !== createdByUser.id){
          throw new AuthorizationError("You can only create the ticket for your user's plant.");
      }
      }

      let assignedTo: string | null = null;
      let assignedBY: string | null = null;

      if (plant.contact_person_email) {
        const contactPersonEmail = plant.contact_person_email.trim().toLowerCase();

        const assigneeUser = await CacheManager.getOrSet<UserRow>({
          key:`users:email:${contactPersonEmail}`,
          fetcher:async() => {
            const assigneeUser = await User.findOne<UserRow>({
                where: { email: contactPersonEmail },
                select: ["id", "role"],
            });
            if(!assigneeUser){
              throw new NotFoundError("Assignee user not found.");
            }
            return assigneeUser;
          }
        })
        

        if (assigneeUser?.role === (UserRole.Admin as string)) {
          assignedTo = assigneeUser.id;
          assignedBY = createdByUser.id;
        }
      }

      const existingActivePlantTicket = await CacheManager.getOrSet<TicketRow[]>({
        key: `tickets:plant:${plantId as string}:created_by:${created_by as string}:active`,
        fetcher: async () => {
          const existingActivePlantTicket = await Ticket.findByIds<TicketRow>({
            where: {
              plant_id: plantId,
              created_by: created_by,
              title: trimString(title),
              description: trimString(description),
              status: ["open", "in_progress"],
            },
            select: ["id"],
          });
          return existingActivePlantTicket;
        },
      });
    
      
      if (existingActivePlantTicket.length>0) {
        throw new ConflictError("You already have an active general ticket open for this plant.");
      }

      if (status && status !== "open") {
        throw new AuthorizationError(
          `You cannot set the ticket status to '${status as string}' while creating a ticket. Status must be 'open'.`,
        );
      }

      const data = {
        name: trimString(name),
        email: normalizeEmail(email),
        phone_number,
        plant_id: plant.id,
        title: trimString(title),
        description: trimString(description),
        status :(status as TicketStatus) ?? "open",
        source: trimString(source) as TicketSource,
        priority:(priority as TicketPriority) ?? "medium",
        attachment_ids: attachment_ids || {},
        assigned_to: assignedTo,
        created_by: createdByUser.id,
        assigned_by: assignedBY,
      };

      const ticket = await Ticket.create<TicketRow>(data);
      if (!ticket) {
        throw new InternalServerError("Failed to create ticket, please try again later.");
      }

      await CacheManager.invalidateMany({
        ids: [ticket.id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });

      if (assignedTo && plant.contact_person_email) {
        try {
          await sendEmail({
            email: plant.contact_person_email,
            subject: `Ticket assigned to you: #${ticket.ticket_number}`,
            message: getAssignmentEmail(ticket, { plant_name: plant.plant_name }),
          });
        } catch (emailError) {
          const emailMsg = emailError instanceof Error ? emailError.message : String(emailError);
          logger.warn(
            `Assignment email could not be delivered for ticket #${ticket.ticket_number} to ${plant.contact_person_email}: ${emailMsg}`,
          );
        }
      }

      return res.sendResponse(
        {
          message: "Ticket created successfully.",
          ticket,
        },
        201,
        {
          targetType: "Ticket",
          targetId: ticket.id,
          action: "create-ticket",
          newData: ticket,
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown-error";
      logger.error(`Create ticket error: ${message}`);
      return next(error);
    }
  },
);

export { router as createTicketForChatbootV1Router };