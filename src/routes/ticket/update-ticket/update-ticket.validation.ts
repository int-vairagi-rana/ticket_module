import { ExpressValidatorWrapper } from "intellisolar-common";
import { TicketStatus } from "../../../enums/ticket.enum";

export const updateTicketValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "id",
      param: true,
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing ticket id.",
    }
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "status",
      mandatory:false,
      customValidators: [(value: string) => Object.values(TicketStatus).includes(value as TicketStatus)],
      message: "Status must be a valid ticket status.",
    },
    {
      name:"reason",
      mandatory:false,
      message:"Reason must be a valid string. "
    }
  ]),
  ...ExpressValidatorWrapper.dateValidator([
    {
      name: "resolved_at",
      mandatory:false,
      message: "Resolved at must be a valid ISO 8601 date.",
    },
    {
      name: "closed_at",
      mandatory:false,
      message: "Closed at must be a valid ISO 8601 date.",
    }
  ])
];
