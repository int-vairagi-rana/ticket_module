import express from "express";
import type { NextFunction, Request, Response } from "express"
import { isAuthenticated, responseHandler, validateRequest, logger, CacheManager } from "intellisolar-common";
import type { FindResult } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { getMyTicketsValidation } from "./get-my-own-tickets.validation";

const router = express.Router();

const cleanQuery = (query: Request["query"]) => {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") continue;
        cleaned[key] = value;
    }

    return cleaned;
};

const getMyTicketListCacheKey = (userId: string, query: Record<string, unknown>) => {
    const sortedQuery = Object.keys(query)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = query[key];
            return acc;
        }, {});

    return `tickets:list:me:${userId}:${JSON.stringify(sortedQuery)}`;
};

router.get(
    "/v1/tickets/me",
    responseHandler,
    isAuthenticated,
    //isAuthorized("get-my-tickets"),
    getMyTicketsValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const currentUser = req.currentUser!;
            const query = {
                ...cleanQuery(req.query),
                for_user_id: currentUser.id,
            };

            const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
                key: getMyTicketListCacheKey(currentUser.id, query),
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
