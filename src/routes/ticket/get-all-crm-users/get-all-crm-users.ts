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
import {getAllCRMUsers} from "./get-all-crm-users.validations";

const router = express.Router();

router.get(
  "/v1/get-all-crm-users",
  responseHandler,
  isAuthenticated,
  isAuthorized("get-all-crm-users"),
  getAllCRMUsers,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const crmAccessToken = process.env['CRM_ACCESS_TOKEN'];
      //console.log("CRM Token:", crmAccessToken)
      const crmEndpoint = process.env['CRM_GET_ALL_USERS_ENDPOINT'];
      //console.log("CRM Endpoint:", crmEndpoint);

      if (!crmAccessToken || !crmEndpoint) {
        throw new AppError("CRM access token or endpoint not configured.",500);
      }

      const crmResponse = await fetch(crmEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${crmAccessToken}`,
        }
      });

      if (!crmResponse.ok) {
        const errorBody = await crmResponse.text();

        logger.error(
          `CRM fetch failed with status ${crmResponse.status}: ${errorBody}`
        );

        throw new AppError("Failed to fetch CRM users.", 502);
      }

      const users = await crmResponse.json();

      return res.sendResponse(
        {
          message: "CRM users fetched successfully.",
          data: users,
        },
        200,
        {
          targetType: "CRM Users",
          action: "fetch",
        }
      );
    } catch (error: unknown) {
      logger.error(
        `CRM fetch error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return next(error);
    }
  }
);

export {router as getAllCRMUsers }
