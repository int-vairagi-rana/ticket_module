import express from "express";
import { getSpecificPlantV1Router } from "./plant/get-specific-plant/get-specific-plant";
import { commissionPlantV1Router } from "./plant/commission-plant/commission-plant";
import { getPlantsNameV1Router } from "./plant/get-plants-name/get-plants-name";
import { createTicketV1Router } from "./ticket/create-ticket/create-ticket";
import { createFeedbackV1Router } from "./ticket/create-feedback/create-feedback";
import { getSpecificTicketV1Router } from "./ticket/get-specific-ticket/get-specific-ticket";
import { getMyOwnTicketsV1Router } from "./ticket/get-my-own-tickets/get-my-own-tickets";
import { getAllTicketsV1Router } from "./ticket/get-all-tickets/get-all-tickets";
import { assignTicketV1Router } from "./ticket/assign-ticket/assign-ticket";
import { updateTicketV1Router } from "./ticket/update-ticket/update.ticket";
import { updateMyOwnTicketV1Router } from "./ticket/update-my-own-ticket/update-my-own-ticket";
import { createCommentV1Router } from "./comments/create-comment/create-comment";
import { getAllCommentsV1Router } from "./comments/get-all-comments/get-all-comments";
import { getSpecificTicketByTicketNumberV1Router} from "./ticket/get-specific-ticket-by-ticket_number/get-specific-ticket-by-ticket_number"
import { updateCommentV1Router } from "./comments/update-comment/update-comment";
import { presignCommentFileV1Router } from "./comments/add-comment-attachments/presign-comment-file";
import { confirmCommentFileV1Router } from "./comments/add-comment-attachments/confirm-comment-file";
import { createTicketForChatbootV1Router } from "./ticket/create-Ticket-for-Chatboot/create-Ticket-for-Chatboot";
import { reAssignTicketV1Router } from "./ticket/re-assign.ticket/re-assign.ticket";
import { deleteTicketsV1Router  } from "./ticket/delete-ticket/delete-ticket";
const router = express.Router();

router.use(commissionPlantV1Router);
router.use(getSpecificPlantV1Router);
router.use(getPlantsNameV1Router);

//tickets routes
router.use(createTicketV1Router);
router.use(createFeedbackV1Router);
router.use(getAllTicketsV1Router);
router.use(getMyOwnTicketsV1Router);
router.use(getSpecificTicketV1Router);
router.use(assignTicketV1Router);
router.use(reAssignTicketV1Router);
router.use(updateMyOwnTicketV1Router);
router.use(updateTicketV1Router);
router.use(deleteTicketsV1Router );

//chatboot ticket routes 
router.use(getSpecificTicketByTicketNumberV1Router);
router.use(createTicketForChatbootV1Router);


//comment routes
router.use(createCommentV1Router);
router.use(getAllCommentsV1Router);
router.use(updateCommentV1Router);
router.use(presignCommentFileV1Router);
router.use(confirmCommentFileV1Router);


export default router;
