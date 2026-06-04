import express from "express";
import { getSpecificPlantV1Router } from "./plant/get-specific-plant/get-specific-plant";
import { commissionPlantV1Router } from "./plant/commission-plant/commission-plant";
import { getPlantsNameV1Router } from "./plant/get-plants-name/get-plants-name";
const router = express.Router();

router.use(commissionPlantV1Router);
router.use(getSpecificPlantV1Router);
router.use(getPlantsNameV1Router);

export default router;
