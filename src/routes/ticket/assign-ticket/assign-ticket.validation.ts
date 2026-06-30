import { ExpressValidatorWrapper } from "intellisolar-common";

export const assignTicketValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "id",
            param: true,
            mandatory: true,
            message: "Invalid or missing ticket id."
        },
        {
            name: "admin_id",
            mandatory: true,
            message: "Invalid or missing admin id."
        },
    ])
];
