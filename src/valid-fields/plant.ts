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
        updatable: false
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
        updatable: false
    },
    {
        name: "organization_id",
        displayName: "Organization ID",
        internalName: "organization_id",
        type: ValueTypesEnum.UUID,
        sortable: false,
        filterable: true,
        searchable: false,
        required: true,
        allowArrayFilter: true
    },
    {
        name: "plant_name",
        displayName: "Plant Name",
        internalName: "plant_name",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: true,
        required: true
    },
    {
        name: "plant_type",
        displayName: "Plant Type",
        internalName: "plant_type",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "plant_category",
        displayName: "Plant Category",
        internalName: "plant_category",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "owner",
        displayName: "Owner",
        internalName: "owner",
        type: ValueTypesEnum.OBJECT,
        sortable: false,
        filterable: false,
        searchable: false,
        updatable: false
    },
    {
        name: "is_forecast",
        displayName: "Forecast",
        internalName: "is_forecast",
        type: ValueTypesEnum.BOOLEAN,
        sortable: false,
        filterable: true,
        searchable: false,
        includeInList: true
    },
    {
        name: "contact_person_name",
        displayName: "Contact Person Name",
        internalName: "contact_person_name",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: true,
        required: true
    },
    {
        name: "contact_person_email",
        displayName: "Contact Person Email",
        internalName: "contact_person_email",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: true,
        required: true
    },
    {
        name: "contact_person_phone",
        displayName: "Contact Person Phone",
        internalName: "contact_person_phone",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "contact_person_designation",
        displayName: "Contact Person Designation",
        internalName: "contact_person_designation",
        type: ValueTypesEnum.OBJECT,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "dc_capacity_kw",
        displayName: "DC Capacity KW",
        internalName: "dc_capacity_kw",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: true,
        searchable: false,
        required: true
    },
    {
        name: "ac_capacity_kw",
        displayName: "AC Capacity KW",
        internalName: "ac_capacity_kw",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: true,
        searchable: false,
        required: true
    },
    {
        name: "sanctioned_load_kw",
        displayName: "Sanctioned Load KW",
        internalName: "sanctioned_load_kw",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: true,
        searchable: false
    },
    {
        name: "connected_load_kw",
        displayName: "Connected Load KW",
        internalName: "connected_load_kw",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: true,
        searchable: false
    },
    {
        name: "grid_voltage_kv",
        displayName: "Grid Voltage KV",
        internalName: "grid_voltage_kv",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false
    },
    {
        name: "connection_point",
        displayName: "Connected Point",
        internalName: "connection_point",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false
    },
    {
        name: "transformer_capacity_kva",
        displayName: "Transformer Capacity KVA",
        internalName: "transformer_capacity_kva",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false
    },
    {
        name: "meter_number",
        displayName: "Meter Number",
        internalName: "meter_number",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: false
    },
    {
        name: "consumer_number",
        displayName: "Consumer Number",
        internalName: "consumer_number",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "feeder_name",
        displayName: "Feeder Name",
        internalName: "feeder_name",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
    },
    {
        name: "substation_name",
        displayName: "Substation Name",
        internalName: "substation_name",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
    },
    {
        name: "discom_name",
        displayName: "Discom Name",
        internalName: "discom_name",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "location_name",
        displayName: "Location Name",
        internalName: "location_name",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: true
    },
    {
        name: "address",
        displayName: "Address",
        internalName: "address",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
    },
    {
        name: "city",
        displayName: "City",
        internalName: "city",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: true
    },
    {
        name: "district",
        displayName: "District",
        internalName: "district",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: true
    },
    {
        name: "taluka",
        displayName: "Taluka",
        internalName: "taluka",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: true
    },
    {
        name: "state",
        displayName: "State",
        internalName: "state",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "country",
        displayName: "Country",
        internalName: "country",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: false,
        searchable: false
    },
    {
        name: "pincode",
        displayName: "Pin Code",
        internalName: "pincode",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "latitude",
        displayName: "Latitude",
        internalName: "latitude",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        required: true,
    },
    {
        name: "longitude",
        displayName: "Longitude",
        internalName: "longitude",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        required: true,
    },
    {
        name: "elevation_m",
        displayName: "Elevation",
        internalName: "elevation_m",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "timezone",
        displayName: "Time Zone",
        internalName: "timezone",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "grid_type",
        displayName: "Grid Type",
        internalName: "grid_type",
        type: ValueTypesEnum.STRING,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "net_metering",
        displayName: "Net Metering",
        internalName: "net_metering",
        type: ValueTypesEnum.BOOLEAN,
        sortable: false,
        filterable: true,
        searchable: false
    },
    {
        name: "commissioning_date",
        displayName: "Commissioning Date",
        internalName: "commissioning_date",
        type: ValueTypesEnum.DATE,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "cod_date",
        displayName: "COD Date",
        internalName: "cod_date",
        type: ValueTypesEnum.DATE,
        sortable: true,
        filterable: true,
        searchable: false,
        creatable: false
    },
    {
        name: "ppa_rate",
        displayName: "PPA Rate",
        internalName: "ppa_rate",
        type: ValueTypesEnum.NUMBER,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "ppa_escalation_percent",
        displayName: "PPA Escalation Percent",
        internalName: "ppa_escalation_percent",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "ppa_duration_years",
        displayName: "PPA Duration Years",
        internalName: "ppa_duration_years",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "revenue_type",
        displayName: "Revenue Type",
        internalName: "revenue_type",
        type: ValueTypesEnum.NUMBER,
        sortable: true,
        filterable: true,
        searchable: false
    },
    {
        name: "tariff_type",
        displayName: "Tariff Type",
        internalName: "tariff_type",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
    },
    {
        name: "expected_annual_generation_kwh",
        displayName: "Expected Annual Generation KWH",
        internalName: "expected_annual_generation_kwh",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "expected_cuf_percent",
        displayName: "Expected CUF Percent",
        internalName: "expected_cuf_percent",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "expected_pr_percent",
        displayName: "Expected PR Percent",
        internalName: "expected_pr_percent",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "expected_yield_kwh_kwp",
        displayName: "Expected Yield KWH kWP",
        internalName: "expected_yield_kwh_kwp",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "module_json",
        displayName: "Module",
        internalName: "module_json",
        type: ValueTypesEnum.ARRAY,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "tilt_angle_degrees",
        displayName: "Tilt Angle Degrees",
        internalName: "tilt_angle_degrees",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "azimuth_angle_degrees",
        displayName: "Azimuth Angle Degrees",
        internalName: "azimuth_angle_degrees",
        type: ValueTypesEnum.NUMBER,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "orientation",
        displayName: "Orientation",
        internalName: "orientation",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "notify_users",
        displayName: "Notify Users",
        internalName: "notify_users",
        type: ValueTypesEnum.ARRAY,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "features",
        displayName: "Features",
        internalName: "features",
        type: ValueTypesEnum.ARRAY,
        sortable: false,
        filterable: false,
        searchable: false,
    },
    {
        name: "is_active",
        displayName: "Status (Active)",
        internalName: "is_active",
        type: ValueTypesEnum.BOOLEAN,
        sortable: false,
        filterable: true,
        searchable: false
    },
    {
        name: "is_commissioned",
        displayName: "Status (Active)",
        internalName: "is_commissioned",
        type: ValueTypesEnum.BOOLEAN,
        sortable: false,
        filterable: true,
        searchable: false,
        creatable: false,
    },
    {
        name: "plant_image",
        displayName: "Plant Image",
        internalName: "plant_image",
        type: ValueTypesEnum.STRING,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "metadata",
        displayName: "Metadata",
        internalName: "metadata",
        type: ValueTypesEnum.OBJECT,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
    },
    {
        name: "tags",
        displayName: "Tags",
        internalName: "tags",
        type: ValueTypesEnum.ARRAY,
        sortable: false,
        filterable: false,
        searchable: false,
        includeInList: false
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
