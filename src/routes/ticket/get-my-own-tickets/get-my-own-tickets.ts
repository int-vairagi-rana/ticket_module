// import express from "express";
// import type { NextFunction, Request, Response } from "express"
// import { isAuthenticated, isAuthorized, responseHandler, validateRequest , logger, CacheManager, AppError , Database , BaseModel } from "intellisolar-common";
// import { UserRole } from "intellisolar-common";
// import { TicketRow } from "../../../interface";
// import { User, Plant , Ticket } from "../../../models";
// import { getMyTicketsValidation } from "./get-my-own-tickets.validation";

// const router = express.Router();


// router.get(
//     "/v1/tickets/me",
//     responseHandler,
//     isAuthenticated,
//     //isAuthorized("get-my-tickets"),
//     getMyTicketsValidation,
//     validateRequest,
//     async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const {
//                 page = 1, limit = 50, search, sort_order, sort_by, title ,priority , status , due_date , overdue , startDate , endDate , plant_name 
//                 , component_type , component_name  ,resolved_at , due_From , due_to , created_at , updated_at , start_date , end_date,  created_from, created_to, updated_from, updated_to
//             } = req.query;

//             const currentUser = req.currentUser!;

           
//         }catch{

//         }
//     }
// );
// export { router as getMyTicketsRouter };
