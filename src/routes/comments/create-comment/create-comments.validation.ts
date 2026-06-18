import { ExpressValidatorWrapper } from "intellisolar-common";
import { body } from "express-validator";

export const createCommentValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "entity_id",
            mandatory: true,
            minLength: 36,
            maxLength: 36,
            nullable: false,
            message: "Invalid or missing entity id."
        }
    ]),
    ...ExpressValidatorWrapper.stringValidator([
        {
            name: "comments",
            mandatory: true,
            minLength: 1,
            maxLength: 1000,
            message: "Comment text is required.",
            nullable: false
        },
        {
            name: "entity_name",
            mandatory: true,
            minLength: 3,
            maxLength: 50,
            message: "Entity name must be a valid string.",
            nullable: false
        }
    ]),
    ...ExpressValidatorWrapper.arrayValidator([
        {
            name: "fiels",
            mandatory: false,
            nullable: true,
            message: "Fiels must be an array."
        }
    ]),
    body("audio")
        .optional({ nullable: true })
        .isObject()
        .withMessage("Audio must be a valid JSON object."),
];