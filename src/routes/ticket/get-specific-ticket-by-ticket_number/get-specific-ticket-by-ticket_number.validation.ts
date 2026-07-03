import { ExpressValidatorWrapper } from "intellisolar-common";

export const getSpecificTicketByTicketNumberValidation = [
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "ticket_number",
      param: true,
      mandatory: true,
      minLength: 8,
      message: "Invalid or missing ticket number.",
    },
  ]),
];
