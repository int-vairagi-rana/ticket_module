// import express from "express";
// import type { NextFunction, Request, Response } from "express";
// import { AuthorizationError, CacheManager, Database, isAuthenticated, logger, responseHandler, UserRole, validateRequest } from "intellisolar-common";
// import { TicketPriority, TicketStatus } from "../../../enums/ticket.enum";
// import { getTicketListCacheKey, getTicketQuery, type TicketQuery } from "../get-all-tickets";
// import { getTicketStatisticsValidation } from "./get-ticket-statistics.validation";

// const router = express.Router();

// type TicketStatistics = {
//     generated: number;
//     resolved: number;
//     total: number;
//     byStatus: Record<string, number>;
//     byPriority: Record<string, number>;
// };

// const emptyCounts = (values: string[]) => values.reduce<Record<string, number>>((acc, value) => {
//     acc[value] = 0;
//     return acc;
// }, {});

// const splitCsv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

// const buildStatsWhereClause = (query: TicketQuery) => {
//     const clauses: string[] = [];
//     const values: unknown[] = [];
//     let index = 1;

//     const addEqualFilter = (field: keyof TicketQuery, column: string) => {
//         const value = query[field];
//         if (typeof value !== "string" || !value.trim()) return;
//         clauses.push(`"${column}" = $${index++}`);
//         values.push(value.trim());
//     };

//     const addArrayFilter = (field: keyof TicketQuery, column: string) => {
//         const value = query[field];
//         if (typeof value !== "string" || !value.trim()) return;
//         const items = splitCsv(value);
//         if (!items.length) return;
//         clauses.push(`"${column}" = ANY($${index++})`);
//         values.push(items);
//     };

//     addArrayFilter("status", "status");
//     addArrayFilter("priority", "priority");
//     addEqualFilter("plant_id", "plant_id");
//     addEqualFilter("component_type_id", "component_type_id");
//     addEqualFilter("component_id", "component_id");
//     addEqualFilter("assigned_to", "assigned_to");
//     addEqualFilter("created_by", "created_by");
//     addEqualFilter("due_date", "due_date");
//     addEqualFilter("resolved_at", "resolved_at");

//     if (query.created_at_start) {
//         clauses.push(`"created_at" >= $${index++}`);
//         values.push(query.created_at_start);
//     }

//     if (query.created_at_end) {
//         clauses.push(`"created_at" <= $${index++}`);
//         values.push(query.created_at_end);
//     }

//     if (query.updated_at_start) {
//         clauses.push(`"updated_at" >= $${index++}`);
//         values.push(query.updated_at_start);
//     }

//     if (query.updated_at_end) {
//         clauses.push(`"updated_at" <= $${index++}`);
//         values.push(query.updated_at_end);
//     }

//     if (query.search) {
//         clauses.push(`("title" ILIKE $${index} OR "description" ILIKE $${index} OR "ticket_number" ILIKE $${index})`);
//         values.push(`%${query.search}%`);
//         index++;
//     }

//     return {
//         whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
//         values
//     };
// };

// const getTicketStatistics = async (query: TicketQuery): Promise<TicketStatistics> => {
//     const { whereClause, values } = buildStatsWhereClause(query);

//     const [summary, byStatus, byPriority] = await Promise.all([
//         Database.query(
//             `
//                 SELECT
//                     COUNT(*)::int AS total,
//                     COUNT(*)::int AS generated,
//                     COUNT(*) FILTER (WHERE status = $${values.length + 1})::int AS resolved
//                 FROM tickets
//                 ${whereClause}
//             `,
//             [...values, TicketStatus.RESOLVED]
//         ),
//         Database.query(
//             `
//                 SELECT status, COUNT(*)::int AS count
//                 FROM tickets
//                 ${whereClause}
//                 GROUP BY status
//             `,
//             values
//         ),
//         Database.query(
//             `
//                 SELECT priority, COUNT(*)::int AS count
//                 FROM tickets
//                 ${whereClause}
//                 GROUP BY priority
//             `,
//             values
//         )
//     ]);

//     const statusCounts = emptyCounts(Object.values(TicketStatus));
//     const priorityCounts = emptyCounts(Object.values(TicketPriority));

//     for (const row of byStatus.rows as Array<{ status: string; count: number }>) {
//         statusCounts[row.status] = row.count;
//     }

//     for (const row of byPriority.rows as Array<{ priority: string; count: number }>) {
//         priorityCounts[row.priority] = row.count;
//     }

//     const summaryRow = summary.rows[0] as { total?: number; generated?: number; resolved?: number } | undefined;

//     return {
//         total: summaryRow?.total ?? 0,
//         generated: summaryRow?.generated ?? 0,
//         resolved: summaryRow?.resolved ?? 0,
//         byStatus: statusCounts,
//         byPriority: priorityCounts
//     };
// };

// router.get(
//     "/v1/tickets/statistics",
//     responseHandler,
//     isAuthenticated,
//     getTicketStatisticsValidation,
//     validateRequest,
//     async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const currentUser = req.currentUser!;
//             const query = getTicketQuery(req);

//             if (currentUser.role === (UserRole.User as string)) {
//                 query.created_by = currentUser.id;
//             } else if (currentUser.role !== (UserRole.Admin as string) && currentUser.role !== (UserRole.SuperAdmin as string)) {
//                 throw new AuthorizationError("You are not authorized to view ticket statistics.");
//             }

//             const statistics = await CacheManager.getOrSet<TicketStatistics>({
//                 key: getTicketListCacheKey("tickets:statistics", currentUser.role, currentUser.id, query),
//                 fetcher: async () => getTicketStatistics(query)
//             });

//             res.sendResponse(
//                 {
//                     message: "Ticket statistics fetched successfully.",
//                     statistics
//                 },
//                 200,
//                 {
//                     targetType: "Ticket",
//                     action: "get-ticket-statistics"
//                 }
//             );
//         } catch (error: unknown) {
//             const message = error instanceof Error ? error.message : String(error);
//             logger.error(`Get ticket statistics error: ${message}`);
//             next(error);
//         }
//     }
// );

// export { router as getTicketStatisticsV1Router };
