import { PlantRow } from "../interface";
import { BaseModel, FindResult, PopulateOption } from "intellisolar-common"
import { plantFieldConfigs } from "../valid-fields";

export class Plant extends BaseModel {

    protected static override tableName = "plants";

    static override fieldConfigs = plantFieldConfigs;

    static override allowedPopulate = {
        users: ["id", "full_name"],
        tenants: ["id", "name"],
        organizations: ["id", "name"]
    };

    static readonly detailPopulateJoins: PopulateOption[] = [
        {
            table: 'users',
            localKey: 'created_by',
            foreignKey: 'id',
            select: ['full_name as created_by_name']
        },
        {
            table: 'users',
            localKey: 'updated_by',
            foreignKey: 'id',
            select: ['full_name as updated_by_name']
        },
        {
            table: 'tenants',
            localKey: 'tenant_id',
            foreignKey: 'id',
            select: ['name as tenant_name']
        },
        {
            table: 'organizations',
            localKey: 'organization_id',
            foreignKey: 'id',
            select: ['name as organization_name']
        }
    ];

    static override async find({
        query,
        tenantScoped = false,
        tenantId,
        selectColumns,
        notSelectedColumns,
        populate = true
    }: {
        query: Record<string, any>;
        tenantScoped?: boolean;
        tenantId?: string;
        selectColumns?: string[];
        notSelectedColumns?: string[];
        populate?: boolean;
    }): Promise<FindResult<PlantRow>> {
        return super.find({
            query,
            tenantScoped,
            tenantId,
            selectColumns,
            notSelectedColumns,
            forcedFilters: tenantScoped && tenantId ? { tenant_id: tenantId } : {},
            populate: populate ? this.detailPopulateJoins : [],
        });
    }
};
