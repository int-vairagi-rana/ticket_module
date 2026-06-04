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

const plantBase: PartialFieldConfig[] = [
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
        updatable: false,
        includeInList: true,
    },
    {
        name: "ticket_number",
        displayName: "Ticket Number",
        internalName: "ticket_number",
        type: ValueTypesEnum.UUID,
        sortable: false,
        filterable: true,
        searchable: false,
        required: true,
        allowArrayFilter:true,
        updatable: false,
        includeInList: true,
    },
    {
        name: "name",
        displayName: "Your Name",
        internalName: "name",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: true,
        searchable: false,
        required: true,
        allowArrayFilter: true,
        updatable:true,
        includeInList: true,
    },
    {
        name: "email",
        displayName: "Email",
        internalName: "email",
        type: ValueTypesEnum.STRING,
        sortable:false,
        filterable: false,
        searchable: false,
        required: true,
        allowArrayFilter: true,
        updatable:true,
        includeInList: true,
    },
    {
        name: "phone_number",
        displayName: "Phone Number",
        internalName: "phone_number",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        required:true,
        allowArrayFilter: true,
        updatable:true,
        includeInList: true,
    },
    {
        name: "component_type_id",
        displayName: "Component type ID",
        internalName: "component_type_id",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: false,
        allowArrayFilter:true,
        required:true,
        updatable: false,
        includeInList: true,
    },
    {
        name: "component_id",
        displayName: "Component ID",
        internalName: "component_id",
        type: ValueTypesEnum.STRING,
        sortable:true,
        filterable: true,
        searchable: false,
        updatable: false,
        allowArrayFilter:true,
        required:true,
        includeInList: true,
    },
    {
        name: "plant_id",
        displayName: "Plant ID",
        internalName: "plant_id",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: true,
        searchable: false,
        includeInList: true,
        updatable:false,
        required:true,
    },
    {
        name: "title",
        displayName: "Title",
        internalName: "title",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: true,
        required: true,
        allowArrayFilter:true,
        updatable:true,
        includeInList:true
    },
    {
        name: "description",
        displayName: "Description",
        internalName: "description",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
        required: true,
        updatable:true,
        includeInList:true,
        includeInDetail:true
    },
    {
        name: "status",
        displayName: "Status",
        internalName: "status",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: true,
        includeInList: true,
        includeInDetail:true,
        required:true,
        allowArrayFilter:true,
    },
    {
        name: "priority",
        displayName: "Priority",
        internalName: "priority",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: true,
        includeInList: true,
        includeInDetail:true,
        required:true,
        allowArrayFilter:true
    },
    {
        name: "created_by",
        displayName: "Created By",
        internalName: "created_by",
        type: ValueTypesEnum.UUID,
        sortable: false,
        filterable: true,
        allowArrayFilter: true,
        searchable: false,
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
        name: "created_at",
        displayName: "Created Time",
        internalName: "created_at",
        type: ValueTypesEnum.DATE,
        sortable: true,
        filterable: true,
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
        updatable: false
    }
]

export const plantFieldConfigs: EntityFieldConfig[] = plantBase.map((field) => ({
    allowArrayFilter: field.allowArrayFilter ?? false,
    creatable: field.creatable ?? true,
    updatable: field.updatable ?? true,
    includeInList: field.includeInList ?? true,
    includeInDetail: field.includeInDetail ?? true,
    required: field.required ?? false,
    ...field,
}));
