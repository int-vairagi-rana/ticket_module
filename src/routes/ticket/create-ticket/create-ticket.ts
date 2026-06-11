import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  CacheManager,
  Database,
  InternalServerError,
  isAuthenticated,
  isAuthorized,
  logger,
  NotFoundError,
  responseHandler,
  sanitizeObject,
  sendEmail,
  UserRole,
  validateRequest,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Plant, Ticket, User } from "../../../models";
// import { Component, ComponentType } from "intellisolar-common";
import { createTicketValidation } from "./create-ticket.validation";
import { getAssignmentEmail } from "../assign-ticket/assign-ticket";

const router = express.Router();

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : value);

router.post(
  "/v1/ticket",
  responseHandler,
  isAuthenticated,
  //isAuthorized("create-ticket"),
  createTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await Database.beginTransaction();
    try {
      const currentUser = req.currentUser!;

      if (currentUser.role !== (UserRole.User as string)) {
        throw new AuthorizationError("You are not authorised to create the ticket.");
      }

      const {
        name,
        email,
        phone_number,
        plant_id: plantId,
        // component_type_id: componentTypeId,
        // component_id: componentId,
        title,
        description,
        status,
        priority,
        attachment_ids,
      } = sanitizeObject(req.body as Record<string, unknown>);

      // Added contact_person_name to select and type so sendEmail can use it
      const plant = await Plant.findOne<{
        id: string;
        contact_person_email: string;
        contact_person_name: string;
      }>({
        where: { id: plantId },
        select: ["id", "contact_person_email", "contact_person_name"],
      });

      if (!plant) {
        throw new NotFoundError("Plant not found.");
      }

      const userPlantIds = currentUser.plant_ids ?? [];
      if (!userPlantIds.includes(plant.id)) {
        throw new AuthorizationError("You are not authorized to create a ticket for this plant.");
      }

      // Find assignee by plant's contact_person_email
      let assignedTo: string | null = null;
      let assignedBY :string | null = null ;

      if (plant.contact_person_email) {
        const contactPersonEmail = plant.contact_person_email.trim().toLowerCase();

        const assigneeUser = await User.findOne<{ id: string }>({
          where: { email: contactPersonEmail },
          select: ["id"],
        });

        assignedTo = assigneeUser?.id ?? null;
        assignedBY = null ; 
      }

      // const componentType = await ComponentType.findOne<{ id: string }>({
      //   where: { id: componentTypeId },
      //   select: ["id"],
      // });
      // if (!componentType) throw new NotFoundError("Component type not found.");

      // const component = await Component.findOne<{ id: string }>({
      //   where: { id: componentId, plant_id: plant.id, component_type_id: componentType.id },
      //   select: ["id"],
      // });
      // if (!component) throw new NotFoundError("Component not found for this plant and component type.");


      //generate the ticket number 
      const countResult = await Database.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM tickets",
        [],
        transaction
      );

      const count = Number(countResult.rows[0]?.count ?? 0);
      const ticketNumber = `TKT-${String(count + 1).padStart(4, "0")}`;

      const data = {
        ticket_number :ticketNumber,
        name: trimString(name),
        email: normalizeEmail(email),
        phone_number,
        plant_id: plant.id,
        // component_type_id: componentTypeId,
        // component_id: componentId,
        title: trimString(title),
        description: trimString(description),
        status,
        priority,
        attachment_ids,                         
        assigned_to: assignedTo,
        created_by: currentUser.id,
        assigned_by : assignedBY
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
      await CacheManager.delPattern("tickets:statistics:*");
      await Database.commitTransaction(transaction);

      // Only send email if a valid assignee was found
      if (assignedTo && plant.contact_person_email) {
        try {
          await sendEmail({
            email: plant.contact_person_email,
            subject: `Ticket assigned to you: #${ticket.ticket_number}`,
            message: getAssignmentEmail(ticket, plant.contact_person_name),
          });
        } catch (emailError) {
          const emailMsg = emailError instanceof Error ? emailError.message : String(emailError);
          logger.warn(
            `Assignment email could not be delivered for ticket #${ticket.ticket_number} to ${plant.contact_person_email}: ${emailMsg}`,
          );
        }
      }

      // Added return before res.sendResponse
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
      if (transaction) {
        await Database.rollbackTransaction(transaction);
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Create ticket error: ${message}`);
      next(error);
    }
  },
);

export { router as createTicketV1Router };