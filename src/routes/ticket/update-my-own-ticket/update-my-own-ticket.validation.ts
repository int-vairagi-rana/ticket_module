import { ExpressValidatorWrapper } from "intellisolar-common";
import { TicketPriority } from "../../../enums/ticket.enum";

export const updateMyOwnTicketValidation = [
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "id",
      param: true,
      mandatory: true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing ticket id.",
    },
    {
      name: "attachments_ids.*",
      nullable:true,
      minLength: 36,
      maxLength: 36,
      message: "Invalid or missing attachments ids.",
    }
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "name",
      nullable: true,
      minLength: 1,
      maxLength: 30,
      message: "Name must be between 1 and 30 characters.",
    },
    {
      name: "title",
      nullable: true,
      minLength: 1,
      maxLength: 255,
      message: "Title must be between 1 and 255 characters.",
    },
    {
      name: "description",
      nullable: true,
      minLength: 10,
      maxLength: 5000,
      message: "Description must be between 10 and 5000 characters.",
    },
    {
      name: "feedback.description",
      nullable: true,
      minLength: 10,
      maxLength: 5000,
      message: "Description must be between 10 and 5000 characters.",
    },
    {
      name: "priority",
      nullable: true,
      customValidators: [
        (value: string) =>
          Object.values(TicketPriority).includes(
            value.trim() as TicketPriority,
          ),
      ],
      message: `Invalid priority type must be in ${Object.values(TicketPriority).join(", ")}.`,
    }
  ]),
  ...ExpressValidatorWrapper.emailValidator([
    {
      name: "email",
      nullable: true,
      message: "Email must be valid format.",
    },
  ]),
  ...ExpressValidatorWrapper.mobileNumberValidator([
    {
      name: "phone_number",
      nullable: true,
      message: "Phone must be a valid phone number.",
    },
  ]),
  ...ExpressValidatorWrapper.objectValidator([
    {
      name: "feedback",
      nullable: true,
      message: "Feedback must be an object",
    },
  ]),
  ...ExpressValidatorWrapper.numberValidator([
    {
      name: "feedback.rating",
      nullable: true,
      min: 1,
      max: 5,
      message: "Rating must be a number between 1 and 5.",
    },
  ]),
  ...ExpressValidatorWrapper.arrayValidator([
    {
      name: "attachments_ids",
      nullable: true,
      minLength: 1,
      message: "Attachment ids must be a non-empty array.",
    },
  ])

];
