import { ExpressValidatorWrapper } from "intellisolar-common";

export const confirmCommentFileValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "document_id",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing component id.",
    },
  ]),
];
