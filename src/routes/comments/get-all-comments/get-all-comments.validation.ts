import { ExpressValidatorWrapper } from "intellisolar-common";

export const getAllCommentsValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "entity_id",
      mandatory: true,
      maxLength: 36,
      minLength: 36,
      message: "Invalid or missing entity id.",
    },
  ]),
];