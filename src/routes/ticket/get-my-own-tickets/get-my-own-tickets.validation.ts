import { ExpressValidatorWrapper } from "intellisolar-common";
import { TicketPriority, TicketStatus } from "../../../enums/ticket.enum";

const isValidTicketStatus = (value: string) => Object.values(TicketStatus).includes(value as TicketStatus);
const isValidTicketPriority = (value: string) => Object.values(TicketPriority).includes(value as TicketPriority);
const isValidSortOrder = (value: string) => ["ASC", "DESC", "asc", "desc"].includes(value);

export const getMyOwnTicketsValidation = [
    ...ExpressValidatorWrapper.numberValidator([
        {
            name: "page",
            query: true,
            nullable: true,
            min: 1,
            message: "Page must be a positive integer."
        },
        {
            name: "limit",
            query: true,
            nullable: true,
            min: 1,
            max: 1000,
            message: "Limit must be between 1 and 1000."
        }
    ]),
    ...ExpressValidatorWrapper.stringValidator([
        {
            name: "search",
            query: true,
            nullable: true,
            minLength: 0,
            maxLength: 255,
            message: "Search term must be at most 255 characters."
        },
        {
            name: "status",
            query: true,
            nullable: true,
            customValidators: [isValidTicketStatus],
            message: "Status must be a valid ticket status."
        },
        {
            name: "priority",
            query: true,
            nullable: true,
            customValidators: [isValidTicketPriority],
            message: "Priority must be a valid ticket priority."
        },
        {
            name: "sort_by",
            query: true,
            nullable: true,
            minLength: 1,
            maxLength: 50,
            message: "Sort field must be valid."
        },
        {
            name: "sort_order",
            query: true,
            nullable: true,
            customValidators: [isValidSortOrder],
            message: "Sort order must be ASC or DESC."
        }
    ]),
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "plant_id",
            query: true,
            nullable: true,
            minLength: 36,
            maxLength: 36,
            message: "Plant id must be valid."
        }
    ])
];
