import { ExpressValidatorWrapper } from "intellisolar-common";

export const updateCommentValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "entity_id",
      param: true,
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing entity id.",
    },
    {
      name: "id",
      param: true,
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing comment id.",
    },
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "comment",
      nullable: true,
      minLength: 3,
      maxLength: 1000,
      isHTML:true,
      message: "Comment must be a string between 3 and 1000 characters.",
    },
  ]),
  ...ExpressValidatorWrapper.arrayValidator([
    {
      name: "files",
      nullable: true,
      message: "Files must be an array.",
    },
  ]),
  ...ExpressValidatorWrapper.objectValidator([
    {
      name: "audio",
      nullable: true,
      message: "Audio must be a valid JSON object.",
    },
  ]),
];
