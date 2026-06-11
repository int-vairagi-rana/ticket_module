import express from "express";
import type { NextFunction, Request, Response } from "express"
import { isAuthenticated, responseHandler, validateRequest, logger, CacheManager } from "intellisolar-common";
import type { FindResult } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { getMyTicketsValidation } from "./get-my-own-tickets.validation";

const router = express.Router();

router.get(
    "/v1/tickets/me",
    responseHandler,
    isAuthenticated,
    //isAuthorized("get-my-own-tickets"),
    getMyTicketsValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const currentUser = req.currentUser!;
            const query : Record<string ,unknown>= {
                ...req.query,
                created_by : currentUser.id,
            };

            const sortedQuery = JSON.stringify(
                Object.keys(query).sort().reduce<Record<string, unknown>>((acc, k) => ({ ...acc, [k]: query[k] }), {})
            );

            const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
                key: `tickets:list:me:${currentUser.id}:${sortedQuery}`,
                fetcher: async () => Ticket.find({ query, populate: true })
            });

            res.sendResponse(
                {
                    message: result.data.length === 0
                        ? "No tickets matched your request."
                        : "Tickets fetched successfully.",
                    tickets: result.data,
                    pagination: {
                        page: result.queryParams.page,
                        limit: result.queryParams.limit,
                        totalCount: result.total,
                        totalPages: Math.ceil(result.total / result.queryParams.limit)
                    }
                },
                200,
                {
                    targetType: "Ticket",
                    action: "get-my-own-tickets"
                }
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`Get my tickets error: ${message}`);
            next(error);

        }
    }
);
export { router as getMyOwnTicketsV1Router };
