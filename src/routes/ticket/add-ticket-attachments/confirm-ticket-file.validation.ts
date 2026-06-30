import { ExpressValidatorWrapper } from "intellisolar-common";

export const confirmTicketFileValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "document_id",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Document_id is required and must be a valid UUID.",
    },
  ]),
];
