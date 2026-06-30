import express, { NextFunction, Request, Response } from "express";
import { commissionPlantValidation } from "./commission-plant.validation";
import { isAuthenticated, isAuthorized, responseHandler, validateRequest } from "intellisolar-common";
import { PlantRow } from "../../../interface";
import { Plant } from "../../../models";
import { CacheManager, InternalServerError, intersectTwoObjects, logger, NotFoundError, pickFromObject, sanitizeObject } from "intellisolar-common";

const router = express.Router();

// Get plant id from params and is_commissioned, commissioning_date from request body.
// Find the plant from the database using the id, if not found then throw a not found error.
// Check if the required fields are changed, if not then return a success response.
// Update the commissioning details of the plant in the database.
// If the update fails, throw an internal server error.
// Invalidate the plant's cache and return a success response.

router.put(
    "/v1/plant/:id/commission",
    responseHandler,
    isAuthenticated,
    isAuthorized("commission-plant"),
    commissionPlantValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params["id"] as string;
            const { is_commissioned, commissioning_date } = req.body;

            const plant = await CacheManager.getOrSet<PlantRow>({
                key: `plant:${id}`,
                fetcher: async () => {
                    const plant = await Plant.findOne<PlantRow>({ where: { id, is_active: true } });
                    if (!plant) throw new NotFoundError("Plant not found.");
                    return plant;
                }
            });

            let updatedData: Partial<PlantRow> = pickFromObject(sanitizeObject({ is_commissioned, commissioning_date }), ["is_commissioned", "commissioning_date"]);
            updatedData = intersectTwoObjects(plant, updatedData);

            if (Object.keys(updatedData).length === 0) {
                return res.sendResponse(
                    {
                        message: `Plant ${is_commissioned ? "commissioned" : "decommissioned"} successfully.`
                    },
                    200,
                    {
                        targetType: "Plant",
                        targetId: id,
                        action: is_commissioned ? "COMMISSION_PLANT" : "DECOMMISSION_PLANT"
                    }
                );
            }

            const updatedPlant = await Plant.updateOne<PlantRow>({ where: { id, is_active: true }, data: { ...updatedData, updated_by: req.currentUser!.id } });
            if (!updatedPlant) {
                throw new InternalServerError("Failed to update plant commissioning status, please try again later.");
            }

            await CacheManager.invalidateMany({ ids: [id], baseKey: "plant", listPattern: "plants:list:*" });

            res.sendResponse(
                {
                    message: `Plant ${is_commissioned ? "commissioned" : "decommissioned"} successfully.`
                },
                200,
                {
                    targetType: "Plant",
                    targetId: id,
                    action: "commission-plant",
                    oldData: plant,
                    newData: updatedPlant,
                    modifiedProperties: {
                        is_commissioned: updatedPlant.is_commissioned,
                        commissioning_date: updatedPlant.commissioning_date,
                        updated_by: updatedPlant.updated_by,
                        updated_at: updatedPlant.updated_at
                    }
                }
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`Commission plant error: ${message}`);
            next(error);
        }
    }
);

export { router as commissionPlantV1Router };
