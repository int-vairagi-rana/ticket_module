import { type EntityFieldConfig, ValueTypesEnum } from "intellisolar-common";

type PartialFieldConfig = Omit<EntityFieldConfig,
    | "allowArrayFilter"
    | "creatable"
    | "updatable"
    | "includeInList"
    | "includeInDetail"
    | "required"
> & {
    allowArrayFilter?: boolean;
    creatable?: boolean;
    updatable?: boolean;
    includeInList?: boolean;
    includeInDetail?: boolean;
    required?: boolean;
};

const ticketBase: PartialFieldConfig[] = [
    {
        name: "id",
        displayName: "ID",
        internalName: "id",
        type: ValueTypesEnum.UUID,
        sortable: false,
        filterable: true,
        searchable: false,
        allowArrayFilter: true,
        creatable: false,
        updatable: false
    },
    {
        name: "ticket_number",
        displayName: "Ticket Number",
        internalName: "ticket_number",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: true,
        searchable: false,
        required: true,
        allowArrayFilter:true,
        updatable: false
    },
    {
        name: "name",
        displayName: "Your Name",
        internalName: "name",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable:true,
        searchable: true,
        required: true,
        allowArrayFilter: true
    },
    {
        name: "email",
        displayName: "Email",
        internalName: "email",
        type: ValueTypesEnum.EMAIL,
        sortable:false,
        filterable: false,
        searchable:false,
        required: true
    },
    {
        name: "phone_number",
        displayName: "Phone Number",
        internalName: "phone_number",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
        required:true
    },
    {
        name: "component_type_id",
        displayName: "Component type ID",
        internalName: "component_type_id",
        type: ValueTypesEnum.UUID,
        sortable:false,
        filterable: true,
        searchable: false,
        allowArrayFilter:true,
    },
    {
        name: "component_id",
        displayName: "Component ID",
        internalName: "component_id",
        type: ValueTypesEnum.UUID,
        sortable:false,
        filterable: true,
        searchable: false,
        allowArrayFilter:true,
        required:false
    },
    {
        name: "plant_id",
        displayName: "Plant ID",
        internalName: "plant_id",
        type: ValueTypesEnum.UUID,
        sortable: false,
        filterable: true,
        searchable: false,
        required:true,
    },
    {
        name: "title",
        displayName: "Title",
        internalName: "title",
        type: ValueTypesEnum.STRING,
        sortable:false,
        filterable: false,
        searchable: true,
        required: true
    },
    {
        name: "description",
        displayName: "Description",
        internalName: "description",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: true,
        required:false
    },
    {
        name: "status",
        displayName: "Status",
        internalName: "status",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable:false,
        allowArrayFilter:true
    },
    {
        name: "source",
        displayName: "Source",
        internalName: "source",
        type: ValueTypesEnum.STRING,
        sortable:true,
        filterable: true,
        searchable: false,
        allowArrayFilter:true,
        updatable:false
    },
    {
        name: "priority",
        displayName: "Priority",
        internalName: "priority",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: true,
        allowArrayFilter:true
    },
    {
        name: "assigned_to",
        displayName: "Assigned to",
        internalName: "assigned_to",
        type: ValueTypesEnum.UUID,
        sortable:false,
        filterable: true,
        searchable: false,
        allowArrayFilter:true
    },
    {
        name: "assigned_by",
        displayName: "Assigned By",
        internalName: "assigned_by",
        type: ValueTypesEnum.UUID,
        sortable:false,
        filterable: true,
        searchable: false,
        allowArrayFilter:true
    },
    {
        name: "feedback",
        displayName: "Feedback",
        internalName: "feedback",
        type: ValueTypesEnum.ARRAY,
        sortable:false,
        filterable:true,
        searchable: false,
        allowArrayFilter:true,

    },
    {
        name: "status_history",
        displayName: "Status history",
        internalName: "status_history",
        type: ValueTypesEnum.ARRAY,
        sortable:false,
        filterable:false,
        searchable: false
    },
    {
        name: "attachments_ids",
        displayName: "Attachments",
        internalName: "attachments_ids",
        type: ValueTypesEnum.ARRAY,
        sortable:false,
        filterable:true,
        searchable: false,
        allowArrayFilter:false
    },
    {
        name: "created_by",
        displayName: "Created By",
        internalName: "created_by",
        type: ValueTypesEnum.UUID,
        sortable: false,
        filterable: true,
        searchable: false,
        allowArrayFilter: true,
        required: true,
        updatable: false
    },
    {
        name: "updated_by",
        displayName: "Updated By",
        internalName: "updated_by",
        type: ValueTypesEnum.UUID,
        sortable: false,
        filterable: true,
        allowArrayFilter: true,
        searchable: false,
        required: true,
        creatable: false
    },
    {
        name: "resolved_at",
        displayName: "Resolved_At",
        internalName: "resolved_at",
        type: ValueTypesEnum.DATE,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "created_at",
        displayName: "Created Time",
        internalName: "created_at",
        type: ValueTypesEnum.DATE,
        sortable: true,
        filterable: true,
        allowArrayFilter:true,
        searchable: false,
        creatable: false,
        updatable: false
    },
    {
        name: "updated_at",
        displayName: "Updated Time",
        internalName: "updated_at",
        type: ValueTypesEnum.DATE,
        sortable: true,
        filterable: true,
        searchable: false,
        creatable: false,
        updatable: false,
        allowArrayFilter:true
    }
]

export const ticketFieldConfigs: EntityFieldConfig[] = ticketBase.map((field) => ({
    allowArrayFilter: field.allowArrayFilter ?? false,
    creatable: field.creatable ?? true,
    updatable: field.updatable ?? true,
    includeInList: field.includeInList ?? true,
    includeInDetail: field.includeInDetail ?? true,
    required: field.required ?? false,
    ...field,
}));
