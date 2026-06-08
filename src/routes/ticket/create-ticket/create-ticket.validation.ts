import { ExpressValidatorWrapper } from "intellisolar-common";
import { TicketPriority, TicketStatus } from "../../../enums/ticket.enum";

const isValidTicketStatus = (value: string) => Object.values(TicketStatus).includes(value as TicketStatus);
const isValidTicketPriority = (value: string) => Object.values(TicketPriority).includes(value as TicketPriority);

export const createTicketValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name : "assigned_to",
            mandatory:true,
            minLength:36,
            maxLength:36,
            nullable:false,
            message : "Invalid  or missing assigned to id."
        }
    ]),
    ...ExpressValidatorWrapper.stringValidator([
        {
            name: "name",
            mandatory: true,
            minLength: 1,
            maxLength: 30,
            message: "Name is required.",
            nullable:false
        },
        {
            name: "title",
            mandatory: true,
            minLength: 1,
            maxLength: 255,
            message: "Title is required.",
            nullable:false
        },
        {
            name: "description",
            mandatory:false,
            minLength: 10,
            maxLength: 5000,
            message: "Description must be between 10  to 5000."
        },
        {
            name: "status",
            mandatory:false,
            customValidators: [isValidTicketStatus],
            message: "Status must be a valid ticket status."
        },
        {
            name: "priority",
            mandatory: false,
            customValidators: [isValidTicketPriority],
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
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "component_type_id",
            mandatory:true,
            minLength: 36,
            maxLength: 36,
            message: "Component type id must be valid."
        },
        {
            name: "component_id",
            mandatory: true,
            minLength: 36,
            maxLength: 36,
            message: "Component id must be valid."
        },
        {
            name: "plant_id",
            mandatory: true,
            minLength: 36,
            maxLength: 36,
            message: "Plant id must be valid."
        }
    ]),
    ...ExpressValidatorWrapper.arrayValidator([
        {
            name: "attachment_ids",
            mandatory:false,
            nullable: true,
            message: "Attachment ids must be an array."
        }
    ])
];
