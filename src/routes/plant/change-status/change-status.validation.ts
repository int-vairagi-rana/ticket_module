import { ExpressValidatorWrapper } from "intellisolar-common";

export const changeStatusValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "id",
            param: true,
            mandatory: true,
            minLength: 36,
            maxLength: 36,
            message: "Missing or invalid plant id."
        }
    ])
];
