import { ExpressValidatorWrapper } from "intellisolar-common";

export const getAllCommentsValidation = [
   ...ExpressValidatorWrapper.uuidValidator([
     {
        name:"entity_id",
        param:true,
        mandatory:true,
        maxLength:36,
        minLength:36,
        message:"Invalid entity ID format."
    }
  ])
];