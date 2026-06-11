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
    },
    {
      name: "assigned_to",
      param: true,
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing assigned_to id.",
    }
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "status",
      nullable: true,
      customValidators: [(value: string) => Object.values(TicketStatus).includes(value as TicketStatus)],
      message: "Status must be a valid ticket status.",
    },
  ]),
  ...ExpressValidatorWrapper.dateValidator([
    {
      name: "resolved_at",
      nullable: true,
      message: "Resolved at must be a valid ISO 8601 date.",
    },
    {
      name: "closed_at",
      nullable: true,
      message: "Closed at must be a valid ISO 8601 date.",
    }
  ])
];
