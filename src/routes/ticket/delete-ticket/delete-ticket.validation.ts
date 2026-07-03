import { ExpressValidatorWrapper } from "intellisolar-common";

export const deleteMyOwnTicketValidation = [
  ...ExpressValidatorWrapper.arrayValidator([
    {
      name: "ids",
      nullable: false,
      minLength: 1,
      maxLength: 100,
      message: "Ids must be a non-empty array",
    },
  ]),
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "ids.*",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing ids.",
    },
  ]),
];
