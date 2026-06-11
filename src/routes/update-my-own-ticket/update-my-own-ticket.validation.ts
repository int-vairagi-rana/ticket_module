import { body } from "express-validator";
import { ExpressValidatorWrapper } from "intellisolar-common";
import { TicketPriority } from "../../enums/ticket.enum";


const isArrayUpdateOp = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return ["add", "remove", "set"].some((key) => key in data);
};

const isStringArrayOrUpdateOp = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.every((item) => typeof item === "string");
  if (!isArrayUpdateOp(value)) return false;

  const data = value as Record<string, unknown>;
  return ["add", "remove", "set"].every((key) => {
    const operationValue = data[key];
    return operationValue === undefined || (Array.isArray(operationValue) && operationValue.every((item) => typeof item === "string"));
  });
};

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
      customValidators: [(value: string) => Object.values(TicketPriority).includes(value as TicketPriority)],
      message: "Priority must be a valid ticket priority.",
    },
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
      message: "Phone number must be a valid mobile number.",
    },
  ]),
  ...ExpressValidatorWrapper.uuidValidator([
    {
      name: "plant_id",
      nullable: true,
      minLength: 36,
      maxLength: 36,
      message: "Plant id must be valid.",
    },
    {
      name: "component_id",
      nullable: true,
      minLength: 36,
      maxLength: 36,
      message: "Component id must be valid.",
    },
    {
      name: "component_type_id",
      nullable: true,
      minLength: 36,
      maxLength: 36,
      message: "Component type id must be valid.",
    },
  ]),
  ...ExpressValidatorWrapper.objectValidator([
    {
      name:"feedback",
      nullable:true,
      message:"Feedback must be an object"
    },
  ]),
  ...ExpressValidatorWrapper.numberValidator([
    {
      name:"feedback.rating",
      nullable:true,
      min:1,
      max:5,
      message:"rating must be between 1 to 5 and int",
    }
  ]),
  body("attachment_ids")
    .optional({ nullable: true })
    .custom(isStringArrayOrUpdateOp)
    .withMessage("Attachment ids must be an array of strings or an array update operation."),
];
