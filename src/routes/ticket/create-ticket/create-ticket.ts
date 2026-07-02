import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  CacheManager,
  ConflictError,
  Database,
  InternalServerError,
  isAuthenticated,
  isAuthorized,
  logger,
  NotFoundError,
  responseHandler,
  sendEmail,
  UserRole,
  validateRequest,
} from "intellisolar-common";
import type { PlantRow, TicketRow } from "../../../interface";
import type {UserRow} from "intellisolar-common";
import { Plant, Ticket, User } from "../../../models";
import { createTicketValidation } from "./create-ticket.validation";
import { getAssignmentEmail } from "../../../utils";
import type { TicketStatus , TicketPriority , TicketSource } from "../../../enums";


const router = express.Router();

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : value);


router.post(
  "/v1/ticket",
  responseHandler,
  isAuthenticated,
  isAuthorized("create-ticket"),
  createTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      const {
        name,
        email,
        phone_number,
        plant_id: plantId,
        component_id: componentId,
        title,
        description,
        status,
        source,
        priority,
        attachments_ids,
      } = req.body as Record<string, unknown>;

       const plant = await CacheManager.getOrSet<PlantRow>({
        key: `plant:${plantId as string}`,
        fetcher: async () => {
          const plant = await Plant.findOne<PlantRow>({
            where: { id : plantId },
            select: ["id", "contact_person_email", "contact_person_name","plant_name" , "plant_ids" , "tenant_id"],
          });
          if (!plant) {
            throw new NotFoundError("Plant not found.");
          }
          return plant;    
        }
      });

      if (currentUser.role === (UserRole.User as string)) {
        const userPlantIds = currentUser.plant_ids ?? [];
        if (!userPlantIds.includes(plant.id)) {
          throw new AuthorizationError("You are not authorized to create a ticket for this plant.");
        } 
      }

      if(currentUser.role === (UserRole.Tenant as string)){
        if(plant.tenant_id !== currentUser.id){
          throw new AuthorizationError("You can only create the ticket for your user's plant.");
      }
      }

      let assignedTo: string | null = null;
      let assignedBY :string | null = null;

      if (plant.contact_person_email) {
        const contactPersonEmail = plant.contact_person_email.toLowerCase();

        const assigneeUser = await CacheManager.getOrSet<UserRow>({
          key:`user:${contactPersonEmail}`,
          fetcher:async()=>{
            const assigneeUser = await User.findOne<UserRow>({
            where: { email: contactPersonEmail },
            select: ["id" , "role"],
          });
          if(!assigneeUser){
            throw new NotFoundError("Assignee user not found.");
          }
          return assigneeUser;
        }
      });
        
        if (assigneeUser?.role === (UserRole.Admin as string)) {
          assignedTo = assigneeUser.id;
          assignedBY = currentUser.id;
        }
      }

      let component : { id:string , component_type_id:string , component_name: string, component_type_name: string;} | undefined;

      if(componentId){

        const componentResult = await Database.query<{ id: string; component_type_id: string , component_name:string , component_type_name:string}>(
        `SELECT c.id, c.component_name , ct.id AS component_type_id , ct.label AS component_type_name
        FROM components c
        INNER JOIN component_types ct ON ct.value = c.component_type
        WHERE c.id = $1 AND c.plant_id = $2 
        LIMIT 1`,
        [componentId, plant.id]
        );
        component = componentResult.rows[0];
        if (!component) throw new NotFoundError("Component not found for this plant and component type.");


        const existingActiveTicket = await Ticket.findByIds<TicketRow>({
            where: {
              component_id: component.id,
              created_by: currentUser.id,
              title: trimString(title),
              description: trimString(description),
              status: ["open", "in_progress"],
            },
            select: ["id"],
        });
         
       
        if (existingActiveTicket.length > 0) {
          throw new ConflictError("You already have an active ticket open for this component.");
        }

      }
      else{
        const existingActivePlantTicket = await Ticket.findByIds<TicketRow>({
          where: {
            plant_id: plantId,
            created_by: currentUser.id,
            title: trimString(title),
            description: trimString(description),
            status: ["open", "in_progress"],
          },
          select: ["id"],
        });

      if (existingActivePlantTicket.length>0) {
        throw new ConflictError("You already have an active general ticket open for this plant.");
      }
      }

      if (status && status !== "open") {
          throw new AuthorizationError(
            `You cannot set the ticket status to '${status as string}' while creating a ticket. Status must be 'open'.`
          );
      }
  
      const data = {
        name: trimString(name),
        email: normalizeEmail(email),
        phone_number,
        plant_id: plant.id,
        component_type_id: component?.component_type_id ?? null,
        component_id: component?.id ?? null,
        title: trimString(title),
        description: trimString(description),
        status: (status as TicketStatus) ?? "open",
        source:(source as TicketSource) ?? "portal",
        priority:(priority as TicketPriority) ?? "medium",
        attachments_ids,                         
        assigned_to: assignedTo,
        created_by: currentUser.id,
        assigned_by : assignedBY
      };

      const ticket = await Ticket.create<TicketRow>(data);
      if (!ticket) {
        throw new InternalServerError("Failed to create ticket, please try again later.");
      }

      await CacheManager.invalidateMany({
        ids: [ticket.id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });

    
      if (assignedTo && plant.contact_person_email) {
        try {
          await sendEmail({
            email: plant.contact_person_email,
            subject: `Ticket assigned to you: #${ticket.ticket_number}`,
             message: getAssignmentEmail(
              ticket,
              { plant_name: plant.plant_name },
              component ? { component_name: component.component_name, component_type_name: component.component_type_name } : null,
              plant.contact_person_name,
            ),
          });
        } catch (emailError) {
          const emailMsg = emailError instanceof Error ? emailError.message : String(emailError);
          logger.warn(
            `Assignment email could not be delivered for ticket #${ticket.ticket_number} to ${plant.contact_person_email}: ${emailMsg}`,
          );
        }
      }

      return res.sendResponse(
        {
          message: "Ticket created successfully.",
          ticket,
        },
        201,
        {
          targetType: "Ticket",
          targetId: ticket.id,
          action: "create-ticket",
          newData: ticket,
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Create ticket error: ${message}`);
      return next(error);
    }
  },
);

export { router as createTicketV1Router };
