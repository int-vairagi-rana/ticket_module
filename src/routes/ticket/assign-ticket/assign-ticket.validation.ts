import { ExpressValidatorWrapper } from "intellisolar-common";

export const assignTicketValidation = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name: "id",
            param: true,
            mandatory: true,
            message: "Invalid or missing ticket id."
        }
    ]),
    ...ExpressValidatorWrapper.emailValidator([
        {
            name: "contact_person_email",
            mandatory: true,
            message: "Contact person email must be valid."
        }
    ])
];
