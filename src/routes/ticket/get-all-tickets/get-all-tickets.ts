import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  CacheManager,
  isAuthenticated,
  isAuthorized,
  logger,
  responseHandler,
  UserRole,
  validateRequest,
  FindResult
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { getAllTicketsValidation } from "./get-all-tickets.validation";

const router = express.Router();


router.get(
  "/v1/tickets",
  responseHandler,
  isAuthenticated,
  isAuthorized('get-all-tickets'),
  getAllTicketsValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      const { page = 1 , limit = 50 , search , sort_by , sort_order , name , email , phone_number , title , status , priority , plant_id ,
         component_id , compoent_type_id , created_by , updated_by , created_from , updated_from , created_by_name ,
         updated_by_name ,resolved_from , resolved_to , has_attachements , has_feedback , overdue , unassigned , source , assigned_to ,
         assigned_by , feedback_rating 
       } = req.query ; 

      const Query :Record<string,any> ={
        page , 
        limit , 
        search , 
        sort_by , 
        sort_order , 
        name , 
        email , 
        phone_number , 
        title , 
        status , 
        priority , 
        plant_id ,
        component_id , 
        compoent_type_id , 
        created_by , 
        updated_by , 
        created_from , 
        updated_from , 
        created_by_name ,
        updated_by_name ,
        resolved_from , 
        resolved_to , 
        has_attachements , 
        has_feedback , 
        overdue , 
        unassigned , 
        source , 
        assigned_to ,
        assigned_by , 
        feedback_rating 
      } ;

      if (currentUser.role === (UserRole.SuperAdmin as string) || currentUser.role === (UserRole.Admin as string)) {
        const query = req.query as Record<string, unknown>;

        const redisKey = CacheManager.buildRedisKey(query);

        const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
          key: `tickets:lists${redisKey}`,
          fetcher: async () => await Ticket.find({ query, populate: true }),
        });

        return res.sendResponse(
          {
            message: result.data.length === 0
              ? "No tickets found."
              : "Tickets fetched successfully.",
            tickets: result.data,
            pagination: {
              page: result.queryParams.page,
              limit: result.queryParams.limit,
              
              total_count: result.total,
              total_pages: Math.ceil(result.total / result.queryParams.limit)
            },
          },
          result.data.length === 0 ? 204 : 200,
          { 
            targetType: "Ticket", 
            action: "get-all-tickets" 
          },
        );
      }

    } catch (error: unknown) {
      logger.error(
        `Get all tickets error: ${error instanceof Error ? error.message : "unknown-error"}`,
      );
      return next(error);
    }
  },
);

export { router as getAllTicketsV1Router };
