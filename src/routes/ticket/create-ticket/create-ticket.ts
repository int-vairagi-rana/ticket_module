import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  CacheManager,
  ConflictError,
  Database,
  InternalServerError,
  isAuthenticated,
  isAuthorized,
  logger,
  NotFoundError,
  responseHandler,
  sendEmail,
  UserRole,
  validateRequest,
} from "intellisolar-common";
import type { PlantRow, TicketRow } from "../../../interface";
import type { UserRow } from "intellisolar-common";
import { Plant, Ticket, User } from "../../../models";
import { createTicketValidation } from "./create-ticket.validation";
import { getAssignmentEmail } from "../../../utils";
import type {
  TicketStatus,
  TicketPriority,
  TicketSource,
} from "../../../enums";

const router = express.Router();

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;
const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

router.post(
  "/v1/ticket",
  responseHandler,
  isAuthenticated,
  isAuthorized("create-ticket"),
  createTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await Database.beginTransaction();

    try {
      const currentUser = req.currentUser!;

      const {
        name,
        email,
        phone_number,
        plant_id: plantId,
        component_id: componentId,
        title,
        description,
        status,
        source,
        priority,
        attachments_ids,
      } = req.body;

      const plant = await CacheManager.getOrSet<PlantRow>({
        key: `plant:${plantId}`,
        fetcher: async () => {
          const plant = await Plant.findOne<PlantRow>({
            where: { id: plantId },
            select: [
              "id",
              "contact_person_email",
              "contact_person_name",
              "plant_name",
            ],
          });
          if (!plant) {
            throw new NotFoundError("Plant not found.");
          }
          return plant;
        },
      });

      if (
        currentUser.role === UserRole.User ||
        currentUser.role === UserRole.Tenant
      ) {
        const userPlantIds = currentUser.plant_ids ?? [];
        if (!userPlantIds.includes(plant.id)) {
          throw new AppError("You are not authorized", 403);
        }
      }

      let assignedTo: string | null = null;
      let assignedBY: string | null = null;

      if (plant.contact_person_email) {
        const contactPersonEmail = plant.contact_person_email;

        const assigneeUser = await CacheManager.getOrSet<UserRow>({
          key: `user:${contactPersonEmail}`,
          fetcher: async () => {
            const assigneeUser = await User.findOne<UserRow>({
              where: { email: contactPersonEmail },
              select: ["id", "role"],
            });
            if (!assigneeUser) {
              throw new NotFoundError("Assignee user not found.");
            }
            return assigneeUser;
          },
        });

        if (assigneeUser?.role === UserRole.Admin) {
          assignedTo = assigneeUser.id;
          assignedBY = currentUser.id;
        }
      }

      let component:
        | {
            id: string;
            component_type_id: string;
            component_name: string;
            component_type_name: string;
          }
        | undefined;

      if (componentId) {
        component = await Ticket.findComponentWithType(componentId, plant.id);
        if (!component)
          throw new NotFoundError(
            "Component not found for this plant and component type.",
          );
      }

      const existingTickets = await Ticket.findByIds<TicketRow>({
        where: {
          plant_id: plantId,
          created_by: currentUser.id,
          title: trimString(title),
          description: trimString(description),
          status: ["open", "in_progress"],
        },
        select: ["id", "component_id"],
      });

      if (existingTickets.length > 0) {
        if (!componentId) {
         
          const hasPlantLevelDuplicate = existingTickets.some((t) => t.component_id === null);
          if (hasPlantLevelDuplicate) {
            throw new ConflictError("You already have an active general ticket open for this plant.");
          }
        } else {
          
          const hasComponentDuplicate = existingTickets.some((t) => t.component_id === component!.id);
          if (hasComponentDuplicate) {
            throw new ConflictError("You already have an active ticket open for this component.");
          }
        }
      }
      
      if (status && status !== "open") {
        throw new AppError(
          `You cannot set the ticket status to '${status}' while creating a ticket. Status must be 'open'.`,
          403,
        );
      }

      const data = {
        name: trimString(name),
        email: normalizeEmail(email),
        phone_number,
        plant_id: plant.id,
        component_type_id: component?.component_type_id ?? null,
        component_id: component?.id ?? null,
        title: trimString(title),
        description: trimString(description),
        status: (status as TicketStatus) ?? "open",
        source: (source as TicketSource) ?? "portal",
        priority: (priority as TicketPriority) ?? "medium",
        attachments_ids,
        assigned_to: assignedTo,
        created_by: currentUser.id,
        assigned_by: assignedBY,
      };

      const ticket = await Ticket.create<TicketRow>(data, {
        transaction: transaction,
      });
      if (!ticket) {
        throw new InternalServerError(
          "Failed to create ticket, please try again later.",
        );
      }

      await CacheManager.invalidateMany({
        ids: [ticket.id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });
      await Database.commitTransaction(transaction);

      if (assignedTo && plant.contact_person_email) {
        try {
          await sendEmail({
            email: plant.contact_person_email,
            subject: `Ticket assigned to you: #${ticket.ticket_number}`,
            message: getAssignmentEmail(
              ticket,
              { plant_name: plant.plant_name },
              component
                ? {
                    component_name: component.component_name,
                    component_type_name: component.component_type_name,
                  }
                : null,
              plant.contact_person_name,
            ),
          });
        } catch (emailError) {
          const emailMsg =
            emailError instanceof Error
              ? emailError.message
              : String(emailError);
          logger.error(
            `Assignment email could not be delivered for ticket #${ticket.ticket_number} to ${plant.contact_person_email}: ${emailMsg}`,
          );
        }
      }

      return res.sendResponse(
        {
          message: "Ticket created successfully.",
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
      logger.error(
        `Create ticket error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return next(error);
    }
  },
);

export { router as createTicketV1Router };
