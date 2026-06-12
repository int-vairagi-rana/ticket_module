import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  CacheManager,
  Database,
  InternalServerError,
  isAuthenticated,
  logger,
  NotFoundError,
  ConflictError,
  responseHandler,
  sendEmail,
  UserRole,
  validateRequest,
  AppError,
} from "intellisolar-common";
import type { TicketRow, PlantRow } from "../../../interface";
import { Ticket, Plant, User } from "../../../models";
import { assignTicketValidation } from "./assign-ticket.validation";
import { getAssignmentEmail } from "../../ticket/get-ticket-statistics/ticket.helper";

const router = express.Router();

const NON_ASSIGNABLE_STATUSES = ["closed", "resolved", "cancelled"];

router.put(
  "/v1/ticket/:id/assign",
  responseHandler,
  isAuthenticated,
  assignTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await Database.beginTransaction();
    try {
      const currentUser = req.currentUser!;
      const id = (req.params["id"] as string).trim();
      const body = req.body as Record<string, unknown>;
      const contactPersonEmail = (body["contact_person_email"] as string).trim().toLowerCase();

      // 1. Admin role guard
      if (currentUser.role !== (UserRole.Admin as string) || currentUser.role !== (UserRole.SuperAdmin as string) ) {
        throw new AuthorizationError("Only admin users can assign tickets.");
      }

      // 2. Fetch ticket from cache or DB
      const ticket = await CacheManager.getOrSet<TicketRow>({
        key: `ticket:${id}`,
        fetcher: async () => {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { id },
            populate: Ticket.detailPopulateJoins,
          });
          if (!ticket) throw new NotFoundError("Ticket not found.");
          return ticket;
        },
      });

      // 3. Ticket must be linked to a plant
      if (!ticket.plant_id) {
        throw new AppError("Ticket is not associated with any plant.", 400);
      }

      // 4. Ticket status guard
      if (NON_ASSIGNABLE_STATUSES.includes(ticket.status)) {
        throw new AppError(`Cannot assign a ticket with status "${ticket.status}". Only open or in-progress tickets can be assigned.`,400);
      }

      // 5. Ticket already assigned guard
      if (ticket.assigned_to) {
        throw new ConflictError(
          "Ticket is already assigned. Please unassign it first before reassigning.",
        );
      }

      // 6. Fetch plant from cache or DB
      const plant = await CacheManager.getOrSet<PlantRow>({
        key: `plant:${ticket.plant_id}`,
        fetcher: async () => {
          const plant = await Plant.findOne<PlantRow>({
            where: { id: ticket.plant_id },
            select: [
              "id",
              "contact_person_email",
              "contact_person_name",
              "contact_person_phone",
            ],
          });
          if (!plant) throw new NotFoundError("Associated plant not found.");
          return plant;
        },
      });

      // 7. Validate contact person email against plant
      if (plant.contact_person_email.trim().toLowerCase() !== contactPersonEmail) {
        throw new AppError("Provided email does not match the plant's registered contact person email.",400);
      }

      if (plant.contact_person_email) {
        const plantContactPersonEmail = plant.contact_person_email.trim().toLowerCase();

        const assigneeUser = await User.findOne<{ id: string }>({
          where: { email: plantContactPersonEmail },
          select: ["id"],
        });

        // 8. Assign ticket
        const updatedTicket = await Ticket.updateOne<TicketRow>({
          where: { id },
          data: {
            assigned_to: assigneeUser?.id ?? null,
            updated_by: currentUser.id,
          },
        });

        if (!updatedTicket) {
          throw new InternalServerError(
            "Failed to assign ticket, please try again later.",
          );
        }
      }

      // 9. Re-fetch fully populated fresh ticket for cache + response
      const freshTicket = await Ticket.findOne<TicketRow>({
        where: { id },
        populate: Ticket.detailPopulateJoins,
      });

      if (!freshTicket) {
        throw new InternalServerError(
          "Failed to retrieve updated ticket details.",
        );
      }

      // 10. Invalidate old cache and set new cache with fresh data
      await CacheManager.invalidateMany({
        ids: [id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });
      await CacheManager.delPattern("tickets:statistics:*");
      await CacheManager.set(`ticket:${id}`, freshTicket); // rebuild cache with fresh data
      await Database.commitTransaction(transaction);

      // 11. Send assignment notification email to contact person — non-blocking
      try {
        await sendEmail({
          email: plant.contact_person_email,
          subject: `Ticket assigned to you: ${freshTicket.ticket_number}`,
          message: getAssignmentEmail(freshTicket, plant.contact_person_name),
        });
      } catch (emailError) {
        const emailMsg =
          emailError instanceof Error ? emailError.message : String(emailError);
        logger.warn(
          `Assignment email could not be delivered for ticket ${freshTicket.ticket_number} to ${plant.contact_person_email}: ${emailMsg}`,
        );
      }

      // 12. Send response with audit log
      res.sendResponse(
        {
          message: "Ticket assigned successfully.",
          ticket: freshTicket,
        },
        200,
        {
          targetType: "Ticket",
          targetId: freshTicket.id,
          action: "assign-ticket",
          oldData: ticket,
          newData: freshTicket,
          modifiedProperties: {
            assigned_to: freshTicket.assigned_to,
            updated_by: freshTicket.updated_by,
            updated_at: freshTicket.updated_at,
          },
        },
      );
    } catch (error: unknown) {
      if (transaction) {
        await Database.rollbackTransaction(transaction);
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Assign ticket error: ${message}`);
      return next(error);
    }
  },
);

export { router as assignTicketV1Router };
