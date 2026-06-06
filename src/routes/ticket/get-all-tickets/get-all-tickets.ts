// import express from "express";
// import type { NextFunction, Request, Response } from "express";
// import { AuthorizationError, CacheManager, isAuthenticated, logger, responseHandler, UserRole, validateRequest } from "intellisolar-common";
// import type { FindResult } from "intellisolar-common";
// import type { TicketRow } from "../../../interface";
// import { Ticket } from "../../../models";
// import { getTicketListCacheKey, getTicketQuery } from "../get-all-tickets";
// import { getAllTicketsValidation } from "./get-all-tickets.validation";

// const router = express.Router();

// router.get(
//     "/v1/tickets",
//     responseHandler,
//     isAuthenticated,
//     getAllTicketsValidation,
//     validateRequest,
//     async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const currentUser = req.currentUser!;
//             const query = getTicketQuery(req);

//             if (currentUser.role === (UserRole.User as string)) {
//                 query.created_by = currentUser.id;
//             } else if (currentUser.role !== (UserRole.Admin as string) && currentUser.role !== (UserRole.SuperAdmin as string)) {
//                 throw new AuthorizationError("You are not authorized to view tickets.");
//             }

//             const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
//                 key: getTicketListCacheKey("tickets:list:all", currentUser.role, currentUser.id, query),
//                 fetcher: async () => Ticket.find({ query, populate: true })
//             });

//             res.sendResponse(
//                 {
//                     message: "Tickets fetched successfully.",
//                     tickets: result.data,
//                     pagination: {
//                         page: result.queryParams.page,
//                         limit: result.queryParams.limit,
//                         totalCount: result.total,
//                         totalPages: Math.ceil(result.total / result.queryParams.limit)
//                     }
//                 },
//                 result.data.length === 0 ? 204 : 200,
//                 {
//                     targetType: "Ticket",
//                     action: "get-all-tickets"
//                 }
//             );
//         } catch (error: unknown) {
//             const message = error instanceof Error ? error.message : String(error);
//             logger.error(`Get all tickets error: ${message}`);
//             next(error);
//         }
//     }
// );

// export { router as getAllTicketsV1Router };
