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
import {getAllCRMProjects} from "./get-all-crm-projects.validation";

const router = express.Router();

router.get(
  "/v1/get-all-crm-projects",
  responseHandler,
  isAuthenticated,
  isAuthorized("get-all-crm-projects"),
  getAllCRMProjects,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const crmAccessToken = process.env['CRM_ACCESS_TOKEN'];
      const crmEndpoint = process.env['CRM_GET_ALL_PROJECTS_ENDPOINT'];

      if (!crmAccessToken || !crmEndpoint) {
        throw new AppError("CRM access token or endpoint not configured.",500);
      }

      const crmResponse = await fetch(crmEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${crmAccessToken}`,
        },
      });

      if (!crmResponse.ok) {
        const errorBody = await crmResponse.text();

        logger.error(
          `CRM fetch failed with status ${crmResponse.status}: ${errorBody}`
        );

        throw new AppError("Failed to fetch CRM Projects.", 502);
      }

      const projects = await crmResponse.json();

      return res.sendResponse(
        {
          message: "CRM Projects fetched successfully.",
          data: projects,
        },
        200,
        {
          targetType: "CRM Projects",
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

export {router as getAllCRMProjects }
