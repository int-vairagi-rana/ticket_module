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
  isAuthorized,
  AppError,
  UserRow,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket, User } from "../../../models";
import { assignTicketValidation } from "./assign-ticket.validation";
import { getAssignmentEmail } from "../../../utils";

const router = express.Router();

const NON_ASSIGNABLE_STATUSES = ["closed", "resolved", "cancelled"];

router.put(
  "/v1/ticket/:id/assign",
  responseHandler,
  isAuthenticated,
  isAuthorized('assign-ticket'),
  assignTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const id = (req.params["id"] as string);
      const body = req.body as Record<string, unknown>;
      const adminId = (body["admin_id"] as string);


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

      if (NON_ASSIGNABLE_STATUSES.includes(ticket.status)) {
        throw new AppError(
          `Cannot assign a ticket with status "${ticket.status}". Only open or in-progress tickets can be assigned.`,
          400,
        );
      }

      if (ticket.assigned_to) {
        throw new ConflictError(
          "Ticket is already assigned. Please unassign it first before reassigning.",
        );
      }
 
      const assigneeUser = await CacheManager.getOrSet<UserRow>({
        key: `user:${adminId}`,
        fetcher: async () => {
          const assigneeUser = await User.findOne<UserRow>({
            where: { id: adminId, is_active: true },
            select: ["id", "name", "email", "role", "plant_ids"],
          });

          if (!assigneeUser) {
            throw new NotFoundError("No active user found with the provided user_id.");
          }

          return assigneeUser;
        },
      });
     
      if (assigneeUser.role !== (UserRole.Admin as string)) {
        throw new AuthorizationError("Tickets can only be assigned to users with the 'Admin' role.");
      }

      const updatedTicket = await Ticket.updateOne<TicketRow>({
        where: { id },
        data: {
          assigned_to: assigneeUser.id,
          assigned_by: currentUser.id,
          updated_by: currentUser.id,
        },
      });

      if (!updatedTicket) {
        throw new InternalServerError("Failed to assign ticket, please try again later.");
      };

      const freshTicket = await CacheManager.getOrSet<TicketRow>({
        key:`ticket:${id}`,
        fetcher :async()=>{
           const freshTicket = await Ticket.findOne<TicketRow>({
            where: { id },
            populate: Ticket.detailPopulateJoins,
          });

          if (!freshTicket) {
            throw new InternalServerError("Failed to retrieve updated ticket details.");
          }

          return freshTicket;
        }
      });
     
      await CacheManager.invalidateMany({
        ids: [id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });
      await CacheManager.delPattern("tickets:statistics:*");
      await CacheManager.set(`ticket:${id}`, freshTicket);
     

      try {
        const componentDetails =
          freshTicket.component_name || freshTicket.component_type
            ? {
                component_name: freshTicket.component_name ?? "",
                component_type_name: freshTicket.component_type ?? "",
              }
            : null;

        await sendEmail({
          email: assigneeUser.email,
          subject: `Ticket assigned to you: ${freshTicket.ticket_number}`,
          message: getAssignmentEmail(
            freshTicket,
            {
              plant_name: freshTicket.plant_name ?? "",
            },
            componentDetails,
            assigneeUser.full_name,
          ),
        });
      } catch (emailError) {
        const emailMsg = emailError instanceof Error ? emailError.message : String(emailError);
        logger.warn(
          `Assignment email could not be delivered for ticket ${freshTicket.ticket_number} to ${assigneeUser.email}: ${emailMsg}`,
        );
      }


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
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Assign ticket error: ${message}`);
      return next(error);
    }
  },
);

export { router as assignTicketV1Router };