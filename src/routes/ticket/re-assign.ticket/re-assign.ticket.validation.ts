import { ExpressValidatorWrapper } from "intellisolar-common";

export const reAssignTicketValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "id",
            param: true,
            mandatory: true,
            nullable:false,
            message: "Invalid or missing ticket id."
        },
        {
            name: "user_id",
            mandatory: true,
            nullable:false,
            message: "Invalid or missing user id."
        },
    ])
];
