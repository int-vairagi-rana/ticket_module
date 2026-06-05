import express from "express";
import { getSpecificPlantV1Router } from "./plant/get-specific-plant/get-specific-plant";
import { commissionPlantV1Router } from "./plant/commission-plant/commission-plant";
import { getPlantsNameV1Router } from "./plant/get-plants-name/get-plants-name";
import { createTicketV1Router } from "./ticket/create-ticket/create-ticket";
import { getSpecificTicketV1Router } from "./ticket/get-specific-ticket/get-specific-ticket";
import { getMyOwnTicketsV1Router } from "./ticket/get-my-own-tickets/get-my-own-tickets";
const router = express.Router();

router.use(commissionPlantV1Router);
router.use(getSpecificPlantV1Router);
router.use(getPlantsNameV1Router);
router.use(createTicketV1Router);
router.use(getMyOwnTicketsV1Router);
router.use(getSpecificTicketV1Router);

export default router;
