import { ExpressValidatorWrapper } from "intellisolar-common";
import { body } from "express-validator";

export const updateCommentValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "entity_id",
            param:true,
            mandatory:true,
            minLength: 36,
            maxLength: 36,
            message: "Invalid entity id."
        },
        {
            name: "id",
            mandatory:true,
            minLength: 36,
            maxLength: 36,
            param:true,
            message: "Invalid comment id."
        }
    ]),
    ...ExpressValidatorWrapper.stringValidator([
        {
            name: "entity_name",
            mandatory: false,
            minLength: 3,
            maxLength: 50,
            message: "Entity name must be a valid string.",
            
        },
        {
            name: "comment",
            mandatory: false,
            minLength: 3,
            maxLength: 1000,
            message: "Comment must be a valid string.",

        },
    ]),
    ...ExpressValidatorWrapper.arrayValidator([
        {
            name: "files",
            mandatory: false,
            nullable: true,
            message: "Files must be an array."
        },
    ]),
    body("audio")
        .optional({ nullable: true })
        .isObject()
        .withMessage("Audio must be a valid JSON object."),
];
