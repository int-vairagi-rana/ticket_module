import { body } from "express-validator";
import { ExpressValidatorWrapper } from "intellisolar-common";

export const bulkDeleteMyOwnTicketValidation = [
  ...ExpressValidatorWrapper.arrayValidator([
    {
      name: "ids",
      nullable: false,
      minLength: 1,
      message: "Ids must be a non-empty array of ticket ids.",
    },
  ]),

  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "ids.*",
      ifConditions: [body("ids").exists().isArray()],
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Each id in ids must be a valid UUID.",
    },
  ]),
];