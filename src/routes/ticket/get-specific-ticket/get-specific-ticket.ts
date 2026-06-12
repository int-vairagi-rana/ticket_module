import express from "express";
import type { NextFunction, Request, Response } from "express";
import { AuthorizationError, CacheManager, isAuthenticated, logger, NotFoundError, responseHandler, UserRole, validateRequest } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { buildTicketStatusMetrics } from "../get-ticket-statistics/ticket.helper";
import { getSpecificTicketValidation } from "./get-specific-ticket.validations";

const router = express.Router();

router.get(
    "/v1/ticket/:id",
    responseHandler,
    isAuthenticated,
    //isAuthorized("get-specific-ticket"),
    getSpecificTicketValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = (req.params["id"] as string).trim();
            const currentUser = req.currentUser!;

           
            const ticket = await CacheManager.getOrSet<TicketRow>({
                key: `ticket:${id}`,
                fetcher: async () => {
                    const ticket = await Ticket.findOne<TicketRow>({
                        where: { id },
                        populate: Ticket.detailPopulateJoins
                    });

                    if (!ticket) {
                        throw new NotFoundError("Ticket not found.");
                    }

                    return ticket;
                }
            });

             // ── Role-based access control ─────
            if (currentUser.role === (UserRole.User as string) && ticket.created_by !== currentUser.id) {
                throw new NotFoundError("Ticket not found.");
            }

            if (currentUser.role === (UserRole.Admin as string) && ticket.assigned_by !== currentUser.id) {
                throw new NotFoundError("Ticket not found.");
            }
            
            if (
                currentUser.role !== (UserRole.User as string) &&
                currentUser.role !== (UserRole.Admin as string) &&
                currentUser.role !== (UserRole.SuperAdmin as string)
            ) {
                throw new AuthorizationError("You do not have permission to view this ticket.");
            }

            const statusMetrics = buildTicketStatusMetrics(ticket);


            const data  = {
                id:ticket.id,
                ticket_number:ticket.ticket_number,
                name:ticket.name,
                email:ticket.email,
                phone_number:ticket.phone_number,
                title:ticket.title,
                description:ticket.description,
                status:ticket.status,
                priority:ticket.priority,
                plant_id:ticket.plant_id,
                component_id:ticket.component_id,
                component_type_id:ticket.component_type_id,
                plant_name:ticket.plant_name,
                component_name:ticket.component_name,
                component_type:ticket.component_type,
                status_history:ticket.status_history,
                status_statistics: statusMetrics,
                feedback: ticket.feedback,
                attachments_ids:ticket.attachment_ids,
                assigned_to_Id:ticket.assigned_to,
                assigned_to_name:ticket.assignee_name,
                assigned_by:ticket.assigned_by,
                assigned_by_name:ticket.assigned_by_name,
                closed_at:ticket.closed_at,
                resolved_at:ticket.resolved_at,
                created_at:ticket.created_at,
                updated_at:ticket.updated_at,
                created_by:ticket.created_by,
                updated_by:ticket.updated_by,
                created_by_name:ticket.created_by_name,
                updated_by_name:ticket.updated_by_name    
            }

            res.sendResponse(
                { 
                    message: "Ticket fetched successfully.",
                    data
                },
                200,
                {
                    targetType: "Ticket",
                    targetId: data.id,
                    action: "get-specific-ticket"
                }
            );
        } 
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Get specific ticket error: ${message}`);
        return next(error);
    }
 }
);

export { router as getSpecificTicketV1Router };
