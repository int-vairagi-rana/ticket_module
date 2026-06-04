import { ExpressValidatorWrapper } from "intellisolar-common";

export const getPlantsNameValidation = [
    ...ExpressValidatorWrapper.numberValidator([
        {
            name: "page",
            query: true,
            nullable: true,
            min: 1,
            message: "Page must be a positive integer"
        },
        {
            name: "limit",
            query: true,
            nullable: true,
            min: 1,
            max: 1000,
            message: "Limit must be between 1 and 1000"
        }
    ]),
    ...ExpressValidatorWrapper.stringValidator([
        {
            name: "search",
            query: true,
            nullable: true,
            minLength: 0,
            maxLength: 255,
            message: "Search term must be at most 255 characters"
        },
    ]),
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "user_id",
            query: true,
            nullable: true,
            minLength: 36,
            maxLength: 36,
            message: "Missing or invalid user id"
        },
        {
            name: "tenant_id",
            query: true,
            nullable: true,
            minLength: 36,
            maxLength: 36,
            message: "Missing or invalid tenant id"
        }
    ])
];
