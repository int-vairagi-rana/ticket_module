import { ExpressValidatorWrapper } from "intellisolar-common";
import { body } from "express-validator";

export const createCommentValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "entity_id",
            mandatory: true,
            param:true,
            minLength: 36,
            maxLength: 36,
            message: "Invalid or missing entity id."
        },
        {
            name: "attachments_ids.*",
            ifConditions: [body("attachments_ids").exists().isArray()],
            nullable: true,
            minLength: 36,
            maxLength: 36,
            message: "Each id in attachments_ids must be a valid UUID.",
        },
        {
            name: "audio.document_id",
            ifConditions: [body("audio").exists().isObject()],
            nullable: true,
            minLength: 36,
            maxLength: 36,
            message: "audio.document_id must be a valid UUID.",
        },
    ]),
    ...ExpressValidatorWrapper.stringValidator([
        {
            name: "comment",
            mandatory: false,
            minLength: 1,
            maxLength: 1000,
            isHTML: true,
            message: "Comment text must be between 1 and 1000 characters.",
            nullable: true,
        }
    ]),
    ...ExpressValidatorWrapper.arrayValidator([
        {
            name: "attachments_ids",
            mandatory: false,
            nullable: true,
            message: "attachments_ids must be an array."
        }
    ]),
];
