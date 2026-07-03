import { ExpressValidatorWrapper } from "intellisolar-common";

export const getAllCommentsValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "entityId",
      param:true,
      mandatory: true,
      maxLength: 36,
      minLength: 36,
      message: "Invalid or missing entity id.",
    },
  ]),
];