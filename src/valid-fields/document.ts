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

const documentBase: PartialFieldConfig[] = [
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
  },
  {
    name: "tenant_id",
    displayName: "Tenant ID",
    internalName: "tenant_id",
    type: ValueTypesEnum.UUID,
    sortable: false,
    filterable: true,
    searchable: false,
    required: true,
    allowArrayFilter: true,
    updatable: false,
  },
  {
    name: "file_name",
    displayName: "File Name",
    internalName: "file_name",
    type: ValueTypesEnum.STRING,
    sortable: true,
    filterable: false,
    searchable: true,
    required: true,
  },
  {
    name: "original_file_name",
    displayName: "Original File Name",
    internalName: "original_file_name",
    type: ValueTypesEnum.STRING,
    sortable: true,
    filterable: false,
    searchable: true,
    required: true,
  },
  {
    name: "file_type",
    displayName: "File Type",
    internalName: "file_type",
    type: ValueTypesEnum.STRING,
    sortable: true,
    filterable: true,
    searchable: false,
    required: true,
  },
  {
    name: "file_size",
    displayName: "File Size",
    internalName: "file_size",
    type: ValueTypesEnum.NUMBER,
    sortable: true,
    filterable: true,
    searchable: false,
    required: true,
  },
  {
    name: "s3_bucket",
    displayName: "S3 Bucket",
    internalName: "s3_bucket",
    type: ValueTypesEnum.STRING,
    sortable: false,
    filterable: false,
    searchable: false,
    required: true,
  },
  {
    name: "s3_key",
    displayName: "S3 Key",
    internalName: "s3_key",
    type: ValueTypesEnum.STRING,
    sortable: false,
    filterable: true,
    searchable: false,
    required: true,
  },
  {
    name: "s3_url",
    displayName: "S3 URL",
    internalName: "s3_url",
    type: ValueTypesEnum.STRING,
    sortable: false,
    filterable: false,
    searchable: false,
    required: false,
  },
  {
    name: "mime_type",
    displayName: "Mime Type",
    internalName: "mime_type",
    type: ValueTypesEnum.STRING,
    sortable: true,
    filterable: true,
    searchable: false,
    required: false,
  },
  {
    name: "upload_status",
    displayName: "Upload Status",
    internalName: "upload_status",
    type: ValueTypesEnum.STRING,
    sortable: true,
    filterable: true,
    searchable: false,
    required: true,
  },
  {
    name: "processing_status",
    displayName: "Processing Status",
    internalName: "processing_status",
    type: ValueTypesEnum.STRING,
    sortable: true,
    filterable: true,
    searchable: false,
    required: true,
  },
  {
    name: "error_message",
    displayName: "Error Message",
    internalName: "error_message",
    type: ValueTypesEnum.STRING,
    sortable: false,
    filterable: false,
    searchable: false,
    required: false,
  },
  {
    name: "uploaded_by",
    displayName: "Uploaded By",
    internalName: "uploaded_by",
    type: ValueTypesEnum.UUID,
    sortable: false,
    filterable: true,
    searchable: false,
    required: false,
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
    updatable: false,
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
  },
];

export const documentFieldConfigs: EntityFieldConfig[] = documentBase.map(
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
