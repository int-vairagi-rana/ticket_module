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

const commentBase: PartialFieldConfig[] = [
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
        name: "entity_name",
        displayName: "Entity Number",
        internalName: "entity_number",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: true,
        searchable: false,
        required: true,
        allowArrayFilter:true,
        updatable: false,
        includeInList: true,
    },
    {
        name: "entity_id",
        displayName: "Entity ID",
        internalName: "entity_id",
        type: ValueTypesEnum.UUID,
        sortable: false,
        filterable: true,
        searchable: false,
        required: true,
        allowArrayFilter: true,
        updatable:true,
        includeInList: true,
    },
    {
        name: "comments",
        displayName: "Comments",
        internalName: "comments",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: true,
        searchable: false,
        required:false,
        allowArrayFilter:true,
        updatable: false,
        includeInList: true,
        includeInDetail:true,

    },
    {
        name: "fiels",
        displayName: "Fiels",
        internalName: "fields",
        type: ValueTypesEnum.ARRAY,
        sortable:false,
        filterable:false,
        searchable: false,
        includeInList: true,
        includeInDetail:true,
        required:false,
        allowArrayFilter:false
    },
    {
        name: "audio",
        displayName: "Audio",
        internalName: "audio",
        type: ValueTypesEnum.ARRAY,
        sortable:false,
        filterable:false,
        searchable: false,
        includeInList: true,
        includeInDetail:true,
        required:false,
        allowArrayFilter:false
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

export const commentFieldConfigs: EntityFieldConfig[] = commentBase.map((field) => ({
    allowArrayFilter: field.allowArrayFilter ?? false,
    creatable: field.creatable ?? true,
    updatable: field.updatable ?? true,
    includeInList: field.includeInList ?? true,
    includeInDetail: field.includeInDetail ?? true,
    required: field.required ?? false,
    ...field,
}));
