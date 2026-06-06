import express from "express";
import type { NextFunction, Request, Response } from "express";
import { AuthorizationError, CacheManager, Database, InternalServerError, isAuthenticated, logger, NotFoundError, responseHandler, sanitizeObject, UserRole, validateRequest } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Plant, Ticket } from "../../../models";
//import {  Component, ComponentType} from "intellisolar-comman";
import { createTicketValidation } from "./create-ticket.validation";
const router = express.Router();

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : value);

router.post(
    "/v1/ticket",
    responseHandler,
    isAuthenticated,
    // isAuthorized("create-ticket"),
    createTicketValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        const transaction = await Database.beginTransaction();
        try {
            
            const currentUser = req.currentUser;
            if (!currentUser) {
                throw new AuthorizationError("Authentication required.");
            }

            const {
                name,
                email,
                phone_number,
                plant_id: plantId,
                //component_type_id:componentTypeId,
                //component_id:componentId,
                title,
                description,
                status,
                priority,
                attachment_ids,
                due_date
            } = sanitizeObject(req.body as Record<string, unknown>);

            if (currentUser.role !== UserRole.User as string) {
                throw new AuthorizationError("You are not authorised to create the ticket..");
            }

            const plant = await Plant.findOne<{ id: string }>({ where: { id: plantId },select: ["id"]});

            if (!plant) {
                throw new NotFoundError("Plant not found.");
            }

            const userPlantIds = currentUser.plant_ids ?? [];

            if (!userPlantIds.includes(plant.id)) {
                throw new AuthorizationError("You are not authorized to create a ticket for this plant.");
            }

            // const componentType = await ComponentType.findOne<{ id: string }>({where: { id: componentTypeId },select: ["id"]});

            // if (!componentType) {
            //     throw new NotFoundError("Component type not found for this plant.");
            // }

            // const component = await Component.findOne<{ id: string }>({
            //     where: {
            //         id: componentId,
            //         plant_id: plant.id,
            //         component_type_id: componentType.id
            //     },
            //     select: ["id"]
            // });

            // if (!component) {
            //     throw new NotFoundError("Component not found for this plant and component type.");
            // }

            const data = {
                name: trimString(name),
                email: normalizeEmail(email),
                phone_number,
                plant_id: plant.id,
                // component_type_id:componentTypeId,
                // component_id:componentId,
                title: trimString(title),
                description: trimString(description),
                status,
                priority,
                attachment_ids,
                due_date,
                created_by: currentUser.id
            };

            const ticket = await Ticket.create<TicketRow>(data);
            if (!ticket) {
                throw new InternalServerError("Failed to create ticket, please try again later.");
            }

            await CacheManager.invalidateMany({ ids: [ticket.id], baseKey: "ticket", listPattern: "tickets:list:*" });
            await CacheManager.delPattern("tickets:statistics:*");
            await Database.commitTransaction(transaction);

            res.sendResponse(
                {
                    message: "Ticket created successfully.",
                    ticket
                },
                201,
                {
                    targetType: "Ticket",
                    targetId: ticket.id,
                    action: "create-ticket",
                    newData: ticket
                }
            );
        } catch (error: unknown) {
            if (transaction) {
                await Database.rollbackTransaction(transaction);
            }
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`Create ticket error: ${message}`);
            next(error);
        }
    }
);

export { router as createTicketV1Router };
