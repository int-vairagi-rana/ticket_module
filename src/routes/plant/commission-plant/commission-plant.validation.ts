import { ExpressValidatorWrapper } from "intellisolar-common";

export const commissionPlantValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "id",
      param: true,
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Missing or invalid plant id."
    }
  ]),
  ...ExpressValidatorWrapper.booleanValidator([
    {
      name: "is_commissioned",
      mandatory: true,
      message: "Iscommissioned must be a boolean value."
    }
  ]),
  ...ExpressValidatorWrapper.dateValidator([
    {
      name: "commissioning_date",
      mandatory: true,
      message: "Commissioning date must be a valid ISO 8601 date."
    }
  ])
];
