import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
    AppError,
    AuthorizationError,
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
    UserRow,
    validateRequest,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket, User } from "../../../models";
import { bulkAssignTicketValidation } from "./bulk-assignment-of-ticket.validation";
import { getAssignmentEmail } from "../../../utils";

const router = express.Router();

const NON_ASSIGNABLE_STATUSES = ["closed", "resolved", "cancelled"];

router.put(
    "/v1/ticket/bulk-assign/:admin_id",
    responseHandler,
    isAuthenticated,
    isAuthorized("assign-ticket"),
    bulkAssignTicketValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        const transaction = await Database.beginTransaction();
        try {
            const currentUser = req.currentUser!;
            const adminId = (req.params["admin_id"] as string).trim();
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
                        throw new NotFoundError("No active user found with the provided admin_id.");
                    }

                    return adminUser;
                },
            });


            if (adminUser.role !== (UserRole.Admin as string)) {
                throw new AuthorizationError("Tickets can only be assigned to users with the 'Admin' role.");
            }

            const cachedTickets = await Promise.all(
                ticketIds.map(async (id) => ({ id, ticket: await CacheManager.get<TicketRow>(`ticket:${id}`) })),
            );

            const tickets: TicketRow[] = [];
            const missingIds: string[] = [];

            cachedTickets.forEach(({ id, ticket }) => {
                if (ticket) {
                    tickets.push(ticket);
                } else {
                    missingIds.push(id);
                }

            });
            
            if (missingIds.length > 0) {
                const dbTickets = await Ticket.findByIds<TicketRow>({
                    where: { id: missingIds },
                    select: [
                        "id",
                        "ticket_number",
                        "status",
                        "assigned_to",
                        "title",
                        "plant_name",
                        "component_name",
                        "component_type",
                    ],
                });

                await Promise.all(dbTickets.map((t) => CacheManager.set(`ticket:${t.id}`, t)));

                tickets.push(...dbTickets);
            }

            if (tickets.length === 0) {
                throw new NotFoundError("No tickets found for the provided ticket_ids.");
            }

            const foundIds = new Set(tickets.map((t) => t.id));
            const notFound = ticketIds.filter((id) => !foundIds.has(id));

            const skipped: { ticket_id: string; reason: string }[] = [];
            const toAssign: TicketRow[] = [];

            for (const ticket of tickets) {
                if (NON_ASSIGNABLE_STATUSES.includes(ticket.status)) {
                    skipped.push({ ticket_id: ticket.id, reason: `Status is "${ticket.status}"` });
                } else if (ticket.assigned_to) {
                    skipped.push({ ticket_id: ticket.id, reason: "Already assigned" });
                } else {
                    toAssign.push(ticket);
                }
            }

            if (toAssign.length === 0) {
                await Database.rollbackTransaction(transaction);
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

            const freshTickets = await Ticket.updateMany<TicketRow>({
                where: { id: toAssignIds },
                data: {
                    assigned_to: adminId,
                    assigned_by: currentUser.id,
                    updated_by: currentUser.id,
                },
            });

            if (!freshTickets.length) {
                throw new InternalServerError("Failed to assign tickets, please try again later.");
            }

            await CacheManager.invalidateMany({
                ids: toAssignIds,
                baseKey: "ticket",
                listPattern: "tickets:list:*",
            });
            await CacheManager.delPattern("tickets:statistics:*");
            await Promise.all(
                freshTickets.map((t) => CacheManager.set(`ticket:${t.id}`, t)),
            );

            await Database.commitTransaction(transaction);

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
                const msg = emailError instanceof Error ? emailError.message : String(emailError);
                logger.warn(`Bulk assign email could not be delivered to ${adminUser.email}: ${msg}`);
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
                    action: "bulk-assign-ticket",
                    newData: { assigned_to: adminId, ticket_ids: toAssignIds },
                },
            );
        } catch (error: unknown) {
            if (transaction) {
                await Database.rollbackTransaction(transaction);
            }
            const message = (error instanceof Error ? error.message : String(error));
            logger.error(`Bulk assign ticket error: ${message}`);
            return next(error);
        }
    },
);

export { router as bulkAssignTicketV1Router };