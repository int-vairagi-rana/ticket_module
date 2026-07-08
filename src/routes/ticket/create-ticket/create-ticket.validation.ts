import { ExpressValidatorWrapper, ValidationError } from "intellisolar-common";
import {
  TicketPriority,
  TicketSource,
  TicketStatus,
} from "../../../enums/ticket.enum";

export const createTicketValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "component_id",
      nullable: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing component id.",
    },
    {
      name: "plant_id",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing plant id.",
    },
    {
      name: "assigned_to",
      nullable:true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing assigned id.",
    },
    {
      name: "attachments_ids.*",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing attachments id.",
    },
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "name",
      mandatory: true,
      minLength: 2,
      maxLength: 30,
      message: "Name must be a string between 2 and 30 characters.",
    },
    {
      name: "title",
      mandatory: true,
      minLength: 2,
      maxLength: 255,
      message: "Title must be a string between 2 and 255 characters.",
    },
    {
      name: "description",
      nullable: true,
      minLength: 10,
      maxLength: 5000,
      message: "Description must be a string between 10 and 5000 characters.",
    },
    {
      name: "status",
      customValidators: [
        (value: string) =>
          Object.values(TicketStatus).includes(value.trim() as TicketStatus),
      ],
      message: `Invalid status type must be in ${Object.values(TicketStatus).join(", ")}.`,
    },
    {
      name: "priority",
      customValidators: [
        (value: string) =>
          Object.values(TicketPriority).includes(
            value.trim() as TicketPriority,
          ),
      ],
      message: `Invalid priority type must be in ${Object.values(TicketPriority).join(", ")}.`,
    },
    {
      name: "source",
      customValidators: [
        (value: string) =>
          Object.values(TicketSource).includes(value.trim() as TicketSource),
      ],
      message: `Invalid source type must be in ${Object.values(TicketSource).join(", ")}.`,
    },
  ]),
  ...ExpressValidatorWrapper.emailValidator([
    {
      name: "email",
      mandatory: true,
      message: "Email must be valid format.",
    },
  ]),
  ...ExpressValidatorWrapper.mobileNumberValidator([
    {
      name: "phone_number",
      mandatory: true,
      message: "Phone must be a valid phone number.",
    },
  ]),
  ...ExpressValidatorWrapper.arrayValidator([
    {
      name: "attachments_ids",
      nullable: true,
      minLength:1,
      maxLength:1000,
      message: "Attachment ids must be a non-empty array.",
    },
  ]),
];

