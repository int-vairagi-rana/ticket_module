import { ExpressValidatorWrapper } from "intellisolar-common";

export const reAssignTicketValidation = [
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
      name: "user_id",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing user id.",
    },
  ]),
];
