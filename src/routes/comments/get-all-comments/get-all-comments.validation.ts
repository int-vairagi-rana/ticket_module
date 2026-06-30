import { ExpressValidatorWrapper } from "intellisolar-common";

const ALLOWED_SORT_FIELDS = ['created_at', 'updated_at'];

export const getAllCommentsValidation = [
   ...ExpressValidatorWrapper.uuidValidator([
    {
        name:"id",
        param: true,
        maxLength:36,
        minLength:36,
        message:"Invalid comment ID format."
    },
     {
        name:"entity_id",
        query: true,
        maxLength:36,
        minLength:36,
        nullable:true,
        message:"Invalid entity ID format."
    },
    {
        name:"created_by",
        query: true,
        maxLength:36,
        minLength:36,
        nullable:true,
        message:"Invalid user ID format."
    },
    {
        name:"updated_by",
        query: true,
        maxLength:36,
        minLength:36,
        nullable:true,
        message:"Invalid user ID format."
    },

    ]),
  ...ExpressValidatorWrapper.numberValidator([
    {
      name: "page",
      query: true,
      nullable: true,
      min: 1,
      message: "Page must be a positive number",
    },
    {
      name: "limit",
      query: true,
      nullable: true,
      min: 1,
      max: 100,
      message: "Limit must be a positive number less than or equal to 100",
    }
  ]),
  ...ExpressValidatorWrapper.stringValidator([
    {
      name: "search",
      query: true,
      nullable: true,
      minLength: 0,
      maxLength: 255,
      message: "Search term must be a string with a maximum length of 255",
    },
    {
      name: "sort_order",
      query: true,
      nullable: true,
      customValidators: [
        (value: string ) => {
            if (value && !['asc','desc','ASC','DESC'].includes(value)) {
                throw new Error("Sort order must be asc or desc or ASC  or DESC");
            }
            return true ; 
        },
    ],
    message: "Sort order can be ascending or descending.",
    },
    {
      name: "sort_by",
      query: true,
      nullable: true,
      customValidators: [
        (value: string ) => {
            if (value && !ALLOWED_SORT_FIELDS.includes(value)) {
                throw new Error("Invalid sort field");
            }
            return true ; 
        },
    ],
      message: "Sort by must be a string.",
    },
    {
      name: "created_by_name",
      query: true,
      nullable: true,
      minLength: 0,
      maxLength: 255,
      message: "created_by_name must  be a string with a maximum length of 255",
    },
    {
      name: "updated_by_name",
      query: true,
      nullable: true,
      minLength: 0,
      maxLength: 255,
      message: "updated_by_name must  be a string with a maximum length of 255",
    },
  ]),
  ...ExpressValidatorWrapper.dateValidator([
    {
      name: "created_from",
      query: true,
      nullable: true,
      message: "Created from date must be a valid ISO 8601 date."
    },
    {
      name: "created_to",
      query: true,
      nullable: true,
      message: "Created to date must be a valid ISO 8601 date."
    },
    {
      name: "updated_from",
      query: true,
      nullable: true,
      message: "Updated from date must be a valid ISO 8601 date."
    },
    {
      name: "updated_to",
      query: true,
      nullable: true,
      message: "Updated to date must be a valid ISO 8601 date."
    },
    {
      name: "resolved_from",
      query: true,
      nullable: true,
      message: "Resolved from date must be a valid ISO 8601 date."
    },
    {
      name: "resolved_to",
      query: true,
      nullable: true,
      message: "Resolved to date must be a valid ISO 8601 date."
    },
  ]),
];