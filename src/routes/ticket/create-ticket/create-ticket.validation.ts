import { ExpressValidatorWrapper } from "intellisolar-common";
import { TicketPriority, TicketStatus } from "../../../enums/ticket.enum";
import {body} from "express-validator";

const isValidTicketStatus = (value: string) => Object.values(TicketStatus).includes(value as TicketStatus);
const isValidTicketPriority = (value: string) => Object.values(TicketPriority).includes(value as TicketPriority);

export const createTicketValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
         {
            name: "component_id",
            mandatory: false,
            minLength: 36,
            maxLength: 36,
            nullable:true,
            message: "Component id must be valid."
        },
        {
            name: "plant_id",
            mandatory: true,
            minLength: 36,
            maxLength: 36,
            message: "Plant id must be valid."
        },
        {
            name : "assigned_to",
            mandatory:false,
            minLength:36,
            maxLength:36,
            nullable:true,
            message : "Invalid  or missing assigned to id."
        },
        {
            name: "attachments_ids.*",
            ifConditions: [body("attachments_ids").exists().isArray()],
            nullable: true,
            minLength: 36,
            maxLength: 36,
            message: "Each id in attachments_ids must be a valid UUID.",
        },
    ]),
    ...ExpressValidatorWrapper.stringValidator([
        {
            name: "name",
            mandatory: true,
            minLength: 1,
            maxLength: 30,
            message: "Name is required.",
        },
        {
            name: "title",
            mandatory: true,
            minLength: 1,
            maxLength: 255,
            message: "Title is required.",
        },
        {
            name: "description",
            mandatory:false,
            minLength: 10,
            maxLength: 5000,
            nullable:true,
            message: "Description must be between 10  to 5000."
        },
        {
            name: "status",
            mandatory:false,
            customValidators: [isValidTicketStatus],
            nullable:false,
            message: "Status must be a valid ticket status."
        },
        {
            name: "priority",
            mandatory: false,
            customValidators: [isValidTicketPriority],
            nullable:false,
            message: "Priority must be a valid ticket priority."
        }
    ]),
    ...ExpressValidatorWrapper.emailValidator([
        {
            name: "email",
            mandatory: true,
            message: "Email must be valid format.",
            nullable:false
        }
    ]),
    ...ExpressValidatorWrapper.mobileNumberValidator([
        {
            name: "phone_number",
            mandatory: true,
            message: "Phone number must be a valid mobile number.",
            nullable:false
        }
    ]),
    ...ExpressValidatorWrapper.arrayValidator([
        {
            name: "attachments_ids",
            mandatory:false,
            nullable: true,
            message: "Attachment ids must be an array."
        }
    ])
];
