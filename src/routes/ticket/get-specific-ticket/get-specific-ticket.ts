import express from "express";
import type { NextFunction, Request, Response } from "express";
import { AppError, CacheManager, isAuthenticated, isAuthorized, logger, NotFoundError, responseHandler, UserRole, validateRequest } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { getSpecificTicketValidation } from "./get-specific-ticket.validations";

const router = express.Router();

router.get(
  "/v1/ticket/:id/",
  responseHandler,
  isAuthenticated,
  isAuthorized("get-specific-ticket"),
  getSpecificTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;

      const currentUser = req.currentUser!;

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key: `ticket:${id}`,
        fetcher: async () => {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { id },
            populate: Ticket.detailPopulateJoins,
          });
          if (!ticket) {
            throw new NotFoundError("Ticket not found.");
          }
          return ticket;
        },
      });

      if (currentUser.role === UserRole.User  && currentUser.id  != ticket.created_by ) {
        throw new AppError("You are not authorized.", 403);
      }

      if (currentUser.role === UserRole.Tenant  &&  currentUser.id != ticket.created_by ) {
        if (ticket.tenant_id !== currentUser.tenant_id) {
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
          action: "get-specific-ticket",
        },
      );
    } catch (error: unknown) {
      logger.error(`Get specific ticket error: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  },
);

export { router as getSpecificTicketV1Router };
