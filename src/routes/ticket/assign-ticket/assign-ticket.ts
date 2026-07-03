import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  CacheManager,
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
import type { UserRow } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket, User } from "../../../models";
import { assignTicketValidation } from "./assign-ticket.validation";
import { getAssignmentEmail } from "../../../utils";

const router = express.Router();

const NON_ASSIGNABLE_STATUSES = ["closed", "resolved", "cancelled"];

router.put(
  "/v1/assign/ticket/:admin_id",
  responseHandler,
  isAuthenticated,
  isAuthorized("assign-ticket"),
  assignTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const adminId = req.params["admin_id"] as string;
      const body = req.body as Record<string, unknown>;
      const ticketIds = [...new Set(body["ticket_ids"] as string[])];

      const adminUser = await CacheManager.getOrSet<UserRow>({
        key: `user:${adminId}`,
        fetcher: async () => {
          const adminUser = await User.findOne<UserRow>({
            where: { id: adminId, is_active: true },
            select: ["id", "full_name", "email", "role"],
          });

          if (!adminUser) {
            throw new NotFoundError("Admin not found.");
          }
          return adminUser;
        },
      });

      if (adminUser.role !== (UserRole.Admin as string)) {
        throw new AppError("You are not authorized", 403);
      }

      const tickets = await Ticket.findByIds<TicketRow>({
        where: { id: ticketIds },
      });

      if (tickets.length === 0) {
        throw new NotFoundError("Tickets not found.");
      }

      const foundIds = new Set(tickets.map((t) => t.id));
      const notFound = ticketIds.filter((id) => !foundIds.has(id));

      const skipped: { ticket_id: string; reason: string }[] = [];
      const toAssign: TicketRow[] = [];

      for (const ticket of tickets) {
        if (NON_ASSIGNABLE_STATUSES.includes(ticket.status)) {
          skipped.push({
            ticket_id: ticket.id,
            reason: `Status is "${ticket.status}"`,
          });
        } else if (ticket.assigned_to) {
          skipped.push({ ticket_id: ticket.id, reason: "Already assigned" });
        } else {
          toAssign.push(ticket);
        }
      }

      if (toAssign.length === 0) {
        return res.sendResponse(
          {
            message: "No tickets were assigned.",
            assigned: [],
            skipped,
            not_found: notFound,
          },
          200,
        );
      }

      const toAssignIds = toAssign.map((t) => t.id);

      const transaction = await Database.beginTransaction();

      const freshTickets = await Ticket.updateMany<TicketRow>({
        where: { id: toAssignIds },
        data: {
          assigned_to: adminId,
          assigned_by: currentUser.id,
          updated_by: currentUser.id,
        },
        transaction,
      });

      if (!freshTickets.length) {
        throw new InternalServerError("Failed to assign tickets.");
      }

      await Database.commitTransaction(transaction);

      await CacheManager.invalidateMany({
        ids: toAssignIds,
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });

      const firstTicket = freshTickets[0] as TicketRow;
      try {
        const componentDetails =
          firstTicket.component_name || firstTicket.component_type
            ? {
                component_name: firstTicket.component_name ?? "",
                component_type_name: firstTicket.component_type ?? "",
              }
            : null;

        await sendEmail({
          email: adminUser.email,
          subject: `${toAssign.length} ticket(s) have been assigned to you`,
          message: getAssignmentEmail(
            firstTicket,
            { plant_name: firstTicket.plant_name ?? "" },
            componentDetails,
            adminUser.full_name,
          ),
        });
      } catch (emailError) {
        const msg =
          emailError instanceof Error ? emailError.message : String(emailError);
        logger.error(
          `Assign email could not be delivered to ${adminUser.email}: ${msg}`,
        );
      }

      return res.sendResponse(
        {
          message: `${freshTickets.length} ticket(s) assigned successfully.`,
          assigned: freshTickets.map((t) => t.id),
          skipped,
          not_found: notFound,
        },
        200,
        {
          targetType: "Ticket",
          targetId: adminId,
          action: "assign-ticket",
          newData: { assigned_to: adminId, ticket_ids: toAssignIds },
        },
      );
    } catch (error: unknown) {
      logger.error(
        `Assign ticket error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return next(error);
    }
  },
);

export { router as multipleAssignTicketV1Router };
