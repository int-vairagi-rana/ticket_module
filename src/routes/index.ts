import express from "express";
import { getSpecificPlantV1Router } from "./plant/get-specific-plant/get-specific-plant";
import { commissionPlantV1Router } from "./plant/commission-plant/commission-plant";
import { getPlantsNameV1Router } from "./plant/get-plants-name/get-plants-name";
import { createTicketV1Router } from "./ticket/create-ticket/create-ticket";
import { createFeedbackV1Router } from "./ticket/create-feedback/create-feedback";
import { getSpecificTicketV1Router } from "./ticket/get-specific-ticket/get-specific-ticket";
import { getMyOwnTicketsV1Router } from "./ticket/get-my-own-tickets/get-my-own-tickets";
import { getAllTicketsV1Router } from "./ticket/get-all-tickets/get-all-tickets";
import { getTicketStatisticsV1Router } from "./ticket/get-ticket-statistics/get-ticket-statistics";
import { assignTicketV1Router } from "./ticket/assign-ticket/assign-ticket";
import { updateTicketV1Router } from "./ticket/update-ticket/update.ticket";
import { updateMyOwnTicketV1Router } from "./update-my-own-ticket/update-my-own-ticket";
const router = express.Router();

router.use(commissionPlantV1Router);
router.use(getSpecificPlantV1Router);
router.use(getPlantsNameV1Router);
router.use(createTicketV1Router);
router.use(createFeedbackV1Router);
router.use(getTicketStatisticsV1Router);
router.use(getAllTicketsV1Router);
router.use(getMyOwnTicketsV1Router);
router.use(assignTicketV1Router);
router.use(updateMyOwnTicketV1Router);
router.use(updateTicketV1Router);
router.use(getSpecificTicketV1Router);

export default router;
