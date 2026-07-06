import { ExpressValidatorWrapper, validExtensions } from "intellisolar-common";
import { MAX_FILE_SIZE_BYTES } from "../../../utils/aws";

export const presignCommentFileValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "entity_id",
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing entity id.",
    },
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "original_file_name",
      mandatory: true,
      message: "Original file name is required and must be a string.",
    },
    {
      name: "mime_type",
      mandatory: true,
      customValidators: [
        (value: string) => {
          if (!(value in validExtensions)) {
            throw new Error();
          }
          return true;
        },
      ],
      message: "Mime type is required and must be a string. Supported file types are JPEG, PNG, WEBP, SVG, PDF, DOC, DOCX, XLS, XLSX, CSV, and JSON.",
    },
  ]),
  ...ExpressValidatorWrapper.numberValidator([
    {
      name: "file_size",
      mandatory: true,
      min: 1,
      max: MAX_FILE_SIZE_BYTES,
      message: "File size must be a positive number and less than 50MB.",
    },
  ]),
];
