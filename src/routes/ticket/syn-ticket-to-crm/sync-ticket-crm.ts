import express from "express";
import type { NextFunction , Request , Response } from "express";
import {
  AppError,
  isAuthenticated,
  isAuthorized,
  logger,
  responseHandler,
  validateRequest,
} from "intellisolar-common";
import { syncTicketToCRMValidation } from "./sync-ticket-crm.validation";

const router = express.Router();

router.post(
    "/v1/syncToCrm",
    responseHandler,
    isAuthenticated,
    isAuthorized("sync-to-crm"),
    syncTicketToCRMValidation,
    validateRequest,
    async(req:Request,res:Response,next:NextFunction)=>{
        try{
            
            const currenUser = req.currentUser!;
            const crm_access_token = process.env['CRM_ACCESS_TOKEN'];
            const crm_endpoint = process.env['SYNC_TICKET_TO_CRM_ENPOINT'];

            if (!crm_access_token || !crm_endpoint) {
                throw new AppError("CRM access token or endpoint not configured.", 500);
            }

            const { ticket_id, name , email , phone_number , title , description , status , priority , project_id , assigned_to , attachments_ids  } = req.body;

            const payload = {
                ticket_id,
                name,
                email,
                phone_number,
                title,
                description,
                status ,
                priority,
                project_id,
                assigned_to,
                attachments:attachments_ids,
                created_by:currenUser.id
            };

            const crmResponse = await fetch(
                crm_endpoint,{
                method:"POST",
                headers: {
                    Authorization: `Bearer ${crm_access_token}`
                },
                body:JSON.stringify(payload),
           });

           if (!crmResponse.ok) {
                const errorBody = await crmResponse.text();
                logger.error(`CRM sync failed with status ${crmResponse.status}: ${errorBody}`);
                throw new AppError("Failed to sync ticket to CRM.", 502);
            }

            return res.sendResponse(
            {
               message: "Sync ticket to CRM successfully.",
            },
            201,
            {
                targetType: "Synchronization",
                action: "sync the ticket to CRM",
            });

        }
        catch(error:unknown){
            logger.error(`Sync error : ${error instanceof Error ? error.message : String(error)}`,);
            return next(error);
        }

    }
);

export {router as syncTicketToCRM }
