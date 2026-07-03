import { ExpressValidatorWrapper } from "intellisolar-common";

export const getSpecificTicketValidation = [
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
];
