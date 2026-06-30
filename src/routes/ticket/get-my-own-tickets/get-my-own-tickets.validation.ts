import { ExpressValidatorWrapper } from "intellisolar-common";
import { TicketPriority ,  TicketStatus } from "../../../enums/ticket.enum";

const ALLOWED_SORT_FIELDS = ['created_at', 'updated_at', 'status', 'priority', 'plant_name','resolved_at'];

export const getMyTicketsValidation = [
   ...ExpressValidatorWrapper.uuidValidator([
    {
        name:"assigned_to",
        query: true,
        nullable:true,
        maxLength:36,
        minLength:36,
        message:"Invalid user ID format."
    },
    {
        name:"created_by",
        query: true,
        nullable:true,
        maxLength:36,
        minLength:36,
        message:"Invalid user ID format."
    },
    {
        name:"updated_by",
        query: true,
        nullable:true,
        maxLength:36,
        minLength:36,
        message:"Invalid user ID format."
    },
    {
        name:"plant_id",
        query: true,
        nullable:true,
        maxLength:36,
        minLength:36,
        message:"Invalid plant ID format."
    },
    {
        name:"component_type_id",
        query: true,
        nullable:true,
        maxLength:36,
        minLength:36,
        message:"Invalid component type ID format."
    },
    {
        name:"component_id",
        query: true,
        nullable:true,
        maxLength:36,
        minLength:36,
        message:"Invalid component ID format."
    }
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
    },
    {
      name: "feedback_rating",
      query: true,
      nullable: true,
      min: 1,
      max: 5,
      message: "Feedback rating must be a number between 1 and 5",
    },
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
      name: "plant_name",
      query: true,
      nullable: true,
      maxLength: 50,
      message: "Plant name must be a valid string"
    },
    {
      name: "component_type",
      query: true,
      nullable: true,
      maxLength: 50,
      message: `Component type must be a valid string`
    },
    {
      name: "component_name",
      query: true,
      nullable: true,
      maxLength: 255,
      message: "Component name must be a valid string",
    },
    {
      name: "title",
      query: true,
      nullable: true,
      maxLength: 100,
      message: "Title must be a string with maximum 100 characters",
    },
    {
      name: "source",
      query: true,
      nullable: true,
      message: "Source must be a valid string",
    },
    {
      name: "status",
      query: true,
      nullable: true,
      customValidators: [
        (value:TicketStatus) => {
          if (!Object.values(TicketStatus).includes(value)) {
            throw new Error("Invalid status type");
          }
          return value ;
        }
      ],
      message: "Status must be a valid status",
    },
    {
      name: "priority",
      query: true,
      nullable: true,
      customValidators: [
        (value:TicketPriority) => {
          if (!Object.values(TicketPriority).includes(value)) {
            throw new Error("Invalid Priority type");
          }
          return value ;
        }
      ],
      message: "Priority must be a valid priority",
    },
  ]),
  ...ExpressValidatorWrapper.dateValidator([
    {
      name: "resolved_from",
      query: true,
      nullable: true,
      message: "Resolved_From must be a valid ISO 8601 date."
    },{
      name: "resolved_to",
      query: true,
      nullable: true,
      message: "Resolved_To must be a valid ISO 8601 date."
    },
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
  ]),
  ...ExpressValidatorWrapper.booleanValidator([
    {   
        name: 'overdue', 
        query: true, 
        nullable: true, 
        message: 'Overdue must be true or false' 

    },
    {  
        name: 'unassigned', 
        query: true, 
        nullable: true, 
        message: 'Unassigned must be true or false' 

    },
    {  
        name: 'has_feedback', 
        query: true, 
        nullable: true, 
        message: 'Has_Feedback must be true or false' 

    },
  ])
];
