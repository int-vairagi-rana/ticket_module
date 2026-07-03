import express from "express";
import type { NextFunction, Request, Response } from "express";
import {  AppError, CacheManager, isAuthenticated, isAuthorized, logger, NotFoundError, responseHandler,  UserRole, validateRequest } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { getSpecificTicketByTicketNumberValidation } from "./get-specific-ticket-by-ticket_number.validation";

const router = express.Router();

router.get(
  "/v1/ticket/by-number/:ticket_number",
  responseHandler,
  isAuthenticated,
  isAuthorized("get-specific-ticket"),
  getSpecificTicketByTicketNumberValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket_number = (req.params["ticket_number"] as string).trim();

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key: `ticket:${ticket_number}`,
        fetcher: async () => {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { ticket_number },
            populate: Ticket.detailPopulateJoins,
          });

          if (!ticket) {
            throw new NotFoundError("Ticket not found.");
          }
          return ticket;
        },
      });

      const currentUser = req.currentUser!;

      if (
        currentUser.role === (UserRole.User as string) &&
        ticket.created_by !== currentUser.id
      ) {
        throw new AppError("You are not authorized.", 403);
      }

      if (
        currentUser.role === (UserRole.Tenant as string) &&
        ticket.created_by !== currentUser.id
      ) {
        if (ticket.tenant_id !== currentUser.id) {
          throw new AppError("You are not authorized.", 403);
        }
      }

      const data = {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        name: ticket.name,
        email: ticket.email,
        phone_number: ticket.phone_number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        plant_id: ticket.plant_id,
        component_id: ticket.component_id,
        component_type_id: ticket.component_type_id,
        plant_name: ticket.plant_name,
        component_name: ticket.component_name,
        component_type: ticket.component_type,
        status_history: ticket.status_history,
        feedback: ticket.feedback,
        attachments_ids: ticket.attachments_ids,
        assigned_to_Id: ticket.assigned_to,
        assigned_to_name: ticket.assignee_name,
        assigned_by: ticket.assigned_by,
        assigned_by_name: ticket.assigned_by_name,
        closed_at: ticket.closed_at,
        resolved_at: ticket.resolved_at,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        created_by: ticket.created_by,
        updated_by: ticket.updated_by,
        created_by_name: ticket.created_by_name,
        updated_by_name: ticket.updated_by_name,
      };

      res.sendResponse(
        {
          message: "Ticket fetched successfully.",
          data,
        },
        200,
        {
          targetType: "Ticket",
          targetId: data.id,
          action: "get-specific-ticket-by-ticket_number",
        },
      );
    } catch (error: unknown) {
      logger.error(`Get specific ticket error: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  },
);

export { router as getSpecificTicketByTicketNumberV1Router };
