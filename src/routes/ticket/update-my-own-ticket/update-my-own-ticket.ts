import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  CacheManager,
  InternalServerError,
  intersectTwoObjects,
  isAuthenticated,
  logger,
  NotFoundError,
  pickFromObject,
  responseHandler,
  sanitizeObject,
  UserRole,
  validateRequest,
  AppError,
  isAuthorized,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { updateMyOwnTicketValidation } from "./update-my-own-ticket.validation";

const router = express.Router();

const UPDATE_FIELDS = [
  "name",
  "email",
  "phone_number",
  "priority",
  "plant_id",
  "component_id",
  "title",
  "description",
  "attachment_ids",
  "feedback",
] as const;

router.put(
  "/v1/ticket/:id/my",
  responseHandler,
  isAuthenticated,
  isAuthorized("update-my-own-ticket"),
  updateMyOwnTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      const currentUser = req.currentUser!;

      const isUser = currentUser.role === (UserRole.User as string);
      const isTenant = currentUser.role === (UserRole.Tenant as string);

      if (!isUser && !isTenant) {
        throw new AppError("You are not authorized.", 403);
      }

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key: `ticket:${id}`,
        fetcher: async () => {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { id },
            populate: Ticket.detailPopulateJoins,
          });
          if (!ticket) throw new NotFoundError("Ticket not found.");
          return ticket;
        },
      });

      if (isUser && ticket.created_by !== currentUser.id) {
        throw new AppError("You are not authorized.", 403);
      }

      if (isTenant && ticket.created_by !== currentUser.id) {
        if (ticket.tenant_id !== currentUser.id) {
          throw new AppError("You are not authorized.", 403);
        }
      }

      const rawBody = req.body as Record<string, unknown>;
      const sanitizedBody = sanitizeObject(rawBody);
      const allowedBody = pickFromObject(sanitizedBody, [
        ...UPDATE_FIELDS,
      ]) as Record<string, unknown>;

      if ("email" in allowedBody && typeof allowedBody["email"] === "string") {
        allowedBody["email"] = allowedBody["email"].trim().toLowerCase();
      }

      for (const field of ["name", "title", "description"]) {
        if (field in allowedBody && typeof allowedBody[field] === "string") {
          allowedBody[field] = allowedBody[field].trim();
        }
      }

      const targetPlantId =
        (allowedBody["plant_id"] as string | undefined) ?? ticket.plant_id;
      const isPlantChanging =
        "plant_id" in allowedBody &&
        allowedBody["plant_id"] &&
        allowedBody["plant_id"] !== ticket.plant_id;

      if (isPlantChanging) {
        const userPlantIds = currentUser.plant_ids ?? [];
        if (!userPlantIds.includes(targetPlantId)) {
          throw new AppError("You are not authorized.", 403);
        }

        if (!("component_id" in allowedBody)) {
          allowedBody["component_id"] = null;
        }
      }

      let component:
        | {
            id: string;
            component_type_id: string;
            component_name: string;
            component_type_name: string;
          }
        | undefined;

      if (allowedBody["component_id"]) {
        component = await Ticket.findComponentWithType(
          allowedBody["component_id"] as string,
          targetPlantId,
        );
        if (!component)
          throw new NotFoundError("Component not found for this plant.");

        allowedBody["component_type_id"] = component.component_type_id;
      }

      if (
        "feedback" in allowedBody &&
        allowedBody["feedback"] !== null &&
        typeof allowedBody["feedback"] === "object"
      ) {
        const feedback = allowedBody["feedback"] as Record<string, unknown>;

        if (
          "description" in feedback &&
          typeof feedback["description"] === "string"
        ) {
          feedback["description"] = feedback["description"].trim();
        }

        if ("rating" in feedback) {
          const rating = feedback["rating"];
          if (
            rating !== undefined &&
            rating !== null &&
            rating !== "" &&
            (!Number.isInteger(rating) ||
              (rating as number) < 1 ||
              (rating as number) > 5)
          ) {
            throw new AppError(
              "Rating must be an integer between 1 and 5.",
              400,
            );
          }
        }
      }

      const updatedData = intersectTwoObjects(ticket, allowedBody) as Record<
        string,
        unknown
      >;

      if (Object.keys(updatedData).length === 0) {
        return res.sendResponse(
          { message: "Your ticket updated successfully." },
          200,
          {
            targetType: "Ticket",
            targetId: id,
            action: "update-my-own-ticket",
          },
        );
      }

      const updatedTicket = await Ticket.updateOne<TicketRow>({
        where: {
          id,
          created_by: isTenant ? ticket.created_by : currentUser.id,
        },
        data: { ...updatedData, updated_by: currentUser.id },
      });

      if (!updatedTicket) {
        throw new InternalServerError(
          "Failed to update ticket, please try again later.",
        );
      }

      const freshTicket = await Ticket.findOne<TicketRow>({
        where: { id },
        populate: Ticket.detailPopulateJoins,
      });

      if (!freshTicket) {
        throw new InternalServerError("Failed to fetch updated ticket.");
      }

      await CacheManager.invalidateMany({
        ids: [id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });
      await CacheManager.set(`ticket:${id}`, freshTicket);

      return res.sendResponse(
        {
          message: "Your ticket updated successfully.",
          ticket: freshTicket,
        },
        200,
        {
          targetType: "Ticket",
          targetId: id,
          action: "update-my-own-ticket",
          oldData: ticket,
          newData: freshTicket,
          modifiedProperties: {
            ...updatedData,
            updated_by: freshTicket.updated_by,
            updated_at: freshTicket.updated_at,
          },
        },
      );
    } catch (error: unknown) {
      logger.error(
        `Update my own ticket error: ${error instanceof Error ? error.message : String(error)}`,
      );
      next(error);
    }
  },
);

export { router as updateMyOwnTicketV1Router };
