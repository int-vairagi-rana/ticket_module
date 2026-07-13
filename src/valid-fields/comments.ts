import { type EntityFieldConfig, ValueTypesEnum } from "intellisolar-common";

type PartialFieldConfig = Omit<
  EntityFieldConfig,
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
    filterable: false,
    searchable: false,
  },
  {
    name: "entity_name",
    displayName: "Entity Number",
    internalName: "entity_name",
    type: ValueTypesEnum.STRING,
    sortable: false,
    filterable: false,
    searchable: false,
  },
  {
    name: "entity_id",
    displayName: "Entity ID",
    internalName: "entity_id",
    type: ValueTypesEnum.UUID,
    sortable: false,
    filterable: true,
    allowArrayFilter:true,
    searchable: false,
    required: true,
  },
  {
    name: "comment",
    displayName: "Comment",
    internalName: "comment",
    type: ValueTypesEnum.STRING,
    sortable: false,
    filterable: false,
    searchable: true,
  },
  {
    name: "audio",
    displayName: "Audio",
    internalName: "audio",
    type: ValueTypesEnum.OBJECT,
    sortable: false,
    filterable: false,
    searchable: false,
  },
  {
    name: "attachments_ids",
    displayName: "Attachments",
    internalName: "attachments_ids",
    type: ValueTypesEnum.ARRAY,
    sortable: false,
    filterable: false,
    searchable: false,
  },
  {
    name: "created_by",
    displayName: "Created By",
    internalName: "created_by",
    type: ValueTypesEnum.UUID,
    sortable: false,
    filterable: false,
    searchable: false,
    required: true,
    updatable: false,
  },
  {
    name: "updated_by",
    displayName: "Updated By",
    internalName: "updated_by",
    type: ValueTypesEnum.UUID,
    sortable: false,
    filterable: false,
    searchable: false,
    required: true,
    creatable: false,
  },
  {
    name: "created_at",
    displayName: "Created Time",
    internalName: "created_at",
    type: ValueTypesEnum.DATE,
    sortable: true,
    filterable: true,
    allowArrayFilter: true,
    searchable: false,
    creatable: false,
    updatable: false,
  },
  {
    name: "updated_at",
    displayName: "Updated Time",
    internalName: "updated_at",
    type: ValueTypesEnum.DATE,
    sortable: true,
    filterable: true,
    allowArrayFilter: true,
    searchable: false,
    creatable: false,
    updatable: false,
  },
];

export const commentFieldConfigs: EntityFieldConfig[] = commentBase.map(
  (field) => ({
    allowArrayFilter: field.allowArrayFilter ?? false,
    creatable: field.creatable ?? true,
    updatable: field.updatable ?? true,
    includeInList: field.includeInList ?? true,
    includeInDetail: field.includeInDetail ?? true,
    required: field.required ?? false,
    ...field,
  }),
);
