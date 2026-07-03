import { ExpressValidatorWrapper } from "intellisolar-common";

export const createFeedbackValidation = [
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
  ...ExpressValidatorWrapper.numberValidator([
    {
      name: "rating",
      mandatory: true,
      min: 1,
      max: 5,
      message: "Rating must be a number between 1 and 5.",
    },
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "description",
      nullable: true,
      minLength: 5,
      maxLength: 1000,
      message: "Description must be between 5 and 1000 characters.",
    },
  ]),
];
