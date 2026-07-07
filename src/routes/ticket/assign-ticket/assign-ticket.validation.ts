import { ExpressValidatorWrapper } from "intellisolar-common";

export const assignTicketValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "admin_id",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing admin id.",
    },
    {
      name: "ticket_ids.*",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing ticket ids.",
    },
  ]),
  ...ExpressValidatorWrapper.arrayValidator([
    {
      name: "ticket_ids",
      mandatory: true,
      minLength: 1,
      maxLength: 100,
      message: "Ticket ids must be a non-empty array.",
    },
  ]),
];
