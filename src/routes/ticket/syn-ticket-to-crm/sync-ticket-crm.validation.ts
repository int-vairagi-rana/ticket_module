import { ExpressValidatorWrapper } from "intellisolar-common";
import {
  TicketPriority,
  TicketStatus,
} from "../../../enums/ticket.enum";

export const syncTicketToCRMValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "id",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing ticket id.",
    },
    {
      name: "project_id",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing project id.",
    },
    {
      name: "assigned_to",
      mandatory: true,
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
    }

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
      name: "attachment_ids",
      nullable: true,
      minLength:1,
      maxLength:1000,
      message: "Attachments ids must be a non-empty array.",
    },
  ]),
];
