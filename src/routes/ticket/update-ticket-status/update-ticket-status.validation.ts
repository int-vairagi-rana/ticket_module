import { ExpressValidatorWrapper } from "intellisolar-common";
import { TicketStatus } from "../../../enums/ticket.enum";

export const updateTicketStatusValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "id",
      param: true,
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing ticket id.",
    },
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "status",
      nullable: true,
      customValidators: [(value: string) => Object.values(TicketStatus).includes(value.trim() as TicketStatus)],
      message: `Invalid status type must be in ${Object.values(TicketStatus).join(", ")}.`,
    },
    {
      name: "reason",
      nullable: true,
      message: "Reason must be a valid string.",
    },
  ])
];
