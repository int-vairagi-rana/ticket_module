import express from "express";
import type { NextFunction, Request, Response } from "express";
import { AppError, isAuthenticated, logger, responseHandler, validateRequest } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { getMyOwnTicketsValidation } from "./get-my-own-tickets.validation";

const router = express.Router();

router.get(
    "/v1/tickets/me",
    responseHandler,
    isAuthenticated,
    getMyOwnTicketsValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const currentUser = req.currentUser;

            if (!currentUser) {
                throw new AppError("Authentication required.", 401);
            }

            const result = await Ticket.find({
                query: {
                    ...req.query,
                    created_by: currentUser.id
                },
                populate: true
            });

            res.sendResponse(
                {
                    message: "Tickets fetched successfully.",
                    tickets: result.data as TicketRow[],
                    pagination: {
                        page: result.queryParams.page,
                        limit: result.queryParams.limit,
                        totalCount: result.total,
                        totalPages: Math.ceil(result.total / result.queryParams.limit)
                    }
                },
                result.data.length === 0 ? 204 : 200,
                {
                    targetType: "Ticket",
                    action: "get-my-own-tickets"
                }
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`Get my own tickets error: ${message}`);
            next(error);
        }
    }
);

export { router as getMyOwnTicketsV1Router };
