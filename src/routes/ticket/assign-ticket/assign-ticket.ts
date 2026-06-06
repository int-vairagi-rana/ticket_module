import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  CacheManager,
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
import { Ticket, Plant } from "../../../models";
import { assignTicketValidation } from "./assign-ticket.validation";

const router = express.Router();

const NON_ASSIGNABLE_STATUSES = ["closed", "resolved", "cancelled"];

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getAssignmentEmail = (
  ticket: TicketRow,
  contactPersonName?: string | null,
): string => {
  const assigneeName = contactPersonName?.trim() || "there";
  const dueDate = ticket.due_date
    ? new Date(ticket.due_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  return `
    <p>Hello ${escapeHtml(assigneeName)},</p>
    <p>A ticket has been assigned to you.</p>
    <p>
      <strong>Ticket Number:</strong> ${escapeHtml(ticket.ticket_number)}<br />
      <strong>Title:</strong> ${escapeHtml(ticket.title)}<br />
      <strong>Priority:</strong> ${escapeHtml(ticket.priority)}<br />
      <strong>Status:</strong> ${escapeHtml(ticket.status)}<br />
      <strong>Due Date:</strong> ${escapeHtml(dueDate)}
    </p>
    <p>
      <strong>Plant Name:</strong> ${escapeHtml(ticket.plant_name || "N/A")}<br />
      <strong>Component Type:</strong> ${escapeHtml(ticket.component_type || "N/A")}<br />
      <strong>Component Name:</strong> ${escapeHtml(ticket.component_name || "N/A")}
    </p>
    <p>
      <strong>Ticket Creator:</strong> ${escapeHtml(ticket.created_by_name || ticket.name || "N/A")}<br />
      <strong>Email:</strong> ${escapeHtml(ticket.email || "N/A")}<br />
      <strong>Phone Number:</strong> ${escapeHtml(ticket.phone_number || "N/A")}
    </p>
    ${ticket.description ? `<p><strong>Description:</strong><br />${escapeHtml(ticket.description)}</p>` : ""}
    <p>Please review and take the required action.</p>
  `;
};

router.put(
  "/v1/ticket/:id/assign",
  responseHandler,
  isAuthenticated,
  assignTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const id = (req.params["id"] as string).trim();
      const body = req.body as Record<string, unknown>;
      const contactPersonEmail = (body["contact_person_email"] as string).trim().toLowerCase();

      // 1. Admin role guard
      if (currentUser.role !== (UserRole.Admin as string)) {
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
        throw new AppError("Ticket is not associated with any plant.",400);
      }

      // 4. Ticket status guard
      if (NON_ASSIGNABLE_STATUSES.includes(ticket.status)) {
        throw new AppError(
          `Cannot assign a ticket with status "${ticket.status}". Only open or in-progress tickets can be assigned.`,400
        );
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

      // 8. Assign ticket
      const updatedTicket = await Ticket.updateOne<TicketRow>({
        where: { id },
        data: {
          assigned_to: contactPersonEmail,
          updated_by: currentUser.id,
        },
      });

      if (!updatedTicket) {
        throw new InternalServerError(
          "Failed to assign ticket, please try again later.",
        );
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
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Assign ticket error: ${message}`);
      next(error);
    }
  },
);

export { router as assignTicketV1Router };
