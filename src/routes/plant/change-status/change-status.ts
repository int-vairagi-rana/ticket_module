import express, { NextFunction, Request, Response } from "express";
import { changeStatusValidation } from "./change-status.validation";
import { isAuthenticated, isAuthorized, responseHandler, User, validateRequest } from "intellisolar-common";
import { PlantRow } from "../../../interface";
import { Plant } from "../../../models";
import { CacheManager, InternalServerError, logger, NotFoundError } from "intellisolar-common";

const router = express.Router();

// Get data from params.
// Get the plant from the cache or database using the provided id; fail if the plant is not found.
// Toggle the active status of the retrieved plant and update the record in the database.
// Return an internal server error if the update operation fails.
// Invalidate the relevant plant caches and return a successful response indicating the new status.

router.put(
  "/v1/plant/:id/status",
  responseHandler,
  isAuthenticated,
  isAuthorized("update-plant"),
  changeStatusValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params["id"] as string).trim();

      const plant = await CacheManager.getOrSet<PlantRow>({
        key: `plant:${id}`,
        fetcher: async () => {
          const plant = await Plant.findOne<PlantRow>({ where: { id } });
          if (!plant) throw new NotFoundError();
          return plant;
        }
      });

      const newStatus = !plant.is_active;

      const updatedPlant = await Plant.updateOne<PlantRow>({
        where: { id },
        data: { is_active: newStatus, updated_by: req.currentUser!.id }
      });

      if (!updatedPlant) {
        throw new InternalServerError("Failed to update plant status");
      }

      const updatedUsers = newStatus
        ? await User.activatePlantForUsers(id, plant.tenant_id)
        : await User.deactivatePlantForUsers(id, plant.tenant_id);

      if (updatedUsers.length > 0) {
        const userIds = updatedUsers.map((user) => user.id);
        await CacheManager.invalidateMany({
          ids: userIds,
          baseKey: "user",
          listPattern: "users:list:*"
        });
        await Promise.all(userIds.map((userId) => CacheManager.delPattern(`user:auth:${userId}`)));
      }

      await CacheManager.del(`plant:${id}`);
      await CacheManager.delPattern("plants:list:*");
      await CacheManager.delPattern("components:list:my:*");

      res.sendResponse(
        {
          message: `Plant ${newStatus ? "activated" : "deactivated"} successfully.`
        },
        200,
        {
          targetType: "Plant",
          targetId: id,
          action: "update-plant",
          oldData: plant,
          newData: updatedPlant,
          modifiedProperties: {
            is_active: updatedPlant.is_active,
            updated_by: updatedPlant.updated_by,
            updated_at: updatedPlant.updated_at,
            updatedUsers
          }
        }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Plant status update failed";
      logger.error({ body: req.body, err: error }, `Plant status update error: ${message}`);
      next(error);
    }
  }
);

export { router as changePlantStatusV1Router };
