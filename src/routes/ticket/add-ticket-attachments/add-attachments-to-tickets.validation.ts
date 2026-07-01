import { ExpressValidatorWrapper } from "intellisolar-common";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "../../../utils/aws";

export const presignTicketFileValidation = [
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "original_file_name",
      mandatory: true,
      message: "Original file name is required and must be a string.",
    },
    {
      name: "mime_type",
      mandatory: true,
      message: "Mime type is required and must be a supported type.",
      customValidators: [
        (value: string) => {
          if (!ALLOWED_MIME_TYPES.has(value)) throw new Error();
          return true;
        },
      ],
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
