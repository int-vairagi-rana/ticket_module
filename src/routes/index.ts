import express from "express";
import { getSpecificPlantV1Router } from "./plant/get-specific-plant/get-specific-plant";
import { commissionPlantV1Router } from "./plant/commission-plant/commission-plant";
import { getPlantsNameV1Router } from "./plant/get-plants-name/get-plants-name";

//Tickets imports
import { createTicketV1Router } from "./ticket/create-ticket/create-ticket";
import { createTicketForChatbootV1Router } from "./ticket/create-ticket-for-chatboot/create-ticket-for-chatboot";
import { createFeedbackV1Router } from "./ticket/create-feedback/create-feedback";
import { getSpecificTicketV1Router } from "./ticket/get-specific-ticket/get-specific-ticket";
import { getAllTicketsV1Router } from "./ticket/get-all-tickets/get-all-tickets";
import { updateTicketStatusV1Router } from "./ticket/update-ticket-status/update-ticket-status";
import { updateMyOwnTicketV1Router } from "./ticket/update-my-own-ticket/update-my-own-ticket";
import { getSpecificTicketByTicketNumberV1Router} from "./ticket/get-specific-ticket-by-ticket_number/get-specific-ticket-by-ticket_number"
import { deleteTicketsV1Router } from "./ticket/delete-ticket/delete-ticket";
import { reAssignTicketV1Router } from "./ticket/re-assign.ticket/re-assign.ticket";
import { multipleAssignTicketV1Router } from "./ticket/assign-ticket/assign-ticket";
import { addAttachmentsToTicketFileV1Router} from "./ticket/add-ticket-attachments/add-attachments-to-tickets";
import { confirmTicketFileV1Router} from "./ticket/confirm-attachments/confirm-ticket-file";

//comments routes 
import { createCommentV1Router } from "./comments/create-comment/create-comment";
import { getAllCommentsV1Router } from "./comments/get-all-comments/get-all-comments";
import { updateCommentV1Router } from "./comments/update-comment/update-comment";
import { presignCommentFileV1Router } from "./comments/add-comment-attachments/add-comment-attachments";
import { confirmCommentFileV1Router } from "./comments/confirm-upload/confirm-comment-attachments";


//sync to crm api routes 
import {  syncTicketToCRM } from "./ticket/syn-ticket-to-crm/sync-ticket-crm";
import {  getAllCRMProjects } from "./ticket/get-all-crm-projects/get-al-crm-projects";
import { getAllCRMUsers } from "./ticket/get-all-crm-users/get-all-crm-users";


const router = express.Router();

router.use(commissionPlantV1Router);
router.use(getSpecificPlantV1Router);
router.use(getPlantsNameV1Router);

//tickets routes
router.use(createTicketV1Router);
router.use(createFeedbackV1Router);
router.use(getAllTicketsV1Router);
router.use(getSpecificTicketV1Router);
router.use(multipleAssignTicketV1Router);
router.use(reAssignTicketV1Router);
router.use(updateMyOwnTicketV1Router);
router.use(updateTicketStatusV1Router);
router.use(deleteTicketsV1Router);
router.use(addAttachmentsToTicketFileV1Router);
router.use(confirmTicketFileV1Router);

//chatboot ticket routes 
router.use(getSpecificTicketByTicketNumberV1Router);
router.use(createTicketForChatbootV1Router);


//comment routes
router.use(getAllCommentsV1Router);
router.use(createCommentV1Router);
router.use(updateCommentV1Router);
router.use(presignCommentFileV1Router);
router.use(confirmCommentFileV1Router);

//sync to crm routes
router.use(syncTicketToCRM);
router.use(getAllCRMProjects);
router.use(getAllCRMUsers);


export default router;
