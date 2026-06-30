import { ExpressValidatorWrapper } from "intellisolar-common";

export const deleteMyOwnTicketValidation  = [
    ...ExpressValidatorWrapper.uuidValidator([
        {
            name:"id",
            param:true,
            maxLength:36,
            minLength:36,
            mandatory:true,
            message:"Invalid or missing ticket id",
        }
    ])
]