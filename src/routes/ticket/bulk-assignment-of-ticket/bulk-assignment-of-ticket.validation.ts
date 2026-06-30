import { ExpressValidatorWrapper } from "intellisolar-common";
import { body } from "express-validator";

export const bulkAssignTicketValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "admin_id",
      param: true,
      mandatory: true,
      minLength:36,
      maxLength:36,
      message: "Invalid or missing admin id.",
    },
    {
      name: "ticket_ids.*",
      ifConditions: [body("ticket_ids").exists().isArray()],
      mandatory: true,
      nullable: false,
      minLength: 36,
      maxLength: 36,
      message: "Each ticket_id must be a valid UUID.",
    },
  ]),
  ...ExpressValidatorWrapper.arrayValidator([
    {
      name: "ticket_ids",
      mandatory: true,
      message: "Ticket ids must be a non-empty array.",
    },
  ]),
];