import { ExpressValidatorWrapper } from "intellisolar-common";
import { body } from "express-validator";

export const createCommentValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "entity_id",
      mandatory: true,
      param: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing entity id.",
    },
    {
      name: "attachments_ids.*",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing attachments id.",
    },
    {
      name: "audio.document_id",
      ifConditions: [body("audio").exists().isObject()],
      nullable: true,
      minLength: 36,
      maxLength: 36,
      message: "Audio document id must be a valid id.",
    },
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "comment",
      nullable: true,
      minLength: 1,
      maxLength: 1000,
      isHTML: true,
      message: "Comment must be a string between 1 and 1000 characters.",
    },
  ]),
  ...ExpressValidatorWrapper.arrayValidator([
    {
      name: "attachments_ids",
      nullable: true,
      message: "Attachment ids must be a non-empty array.",
    },
  ]),
];
