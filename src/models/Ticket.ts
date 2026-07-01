import type { TicketRow } from "../interface";
import { BaseModel } from "intellisolar-common"
import type { FindResult, PopulateOption } from "intellisolar-common"
import { ticketFieldConfigs } from "../valid-fields";

export class Ticket extends BaseModel {

    protected static override tableName = "tickets";

    static override fieldConfigs = ticketFieldConfigs;

    static override allowedPopulate = {
        users: ["id", "full_name"],
        component_types: ["id", "label"],
        components : ["id","component_name"],
        plants: ["id", "plant_name"],
    };

    static readonly detailPopulateJoins: PopulateOption[] = [
        {
            table: 'users',
            localKey: 'created_by', 
            foreignKey: 'id',
            select: ['full_name as created_by_name', 'tenant_id as tenant_id']
        },
        {
            table: 'users',
            localKey: 'updated_by',
            foreignKey: 'id',
            select: ['full_name as updated_by_name']
        },
        {   
            table: 'users',
            localKey: 'assigned_to',
            foreignKey: 'id',
            select: ['full_name as assignee_name']
        },
        {   
            table: 'users',
            localKey: 'assigned_by',
            foreignKey: 'id',
            select: ['full_name as assigned_by_name']
        },
        {
            table: 'plants',
            localKey: 'plant_id',
            foreignKey: 'id',
            select: ['plant_name']
        },
        {
            table:'components',
            localKey:'component_id',
            foreignKey:'id',
            select:['component_name']
        },
        {
            table:'component_types',
            localKey:'component_type_id',
            foreignKey:'id',
            select:['label as component_type']
        }
    ];

   static override async find({
           query,
           selectColumns,
           notSelectedColumns,
           populate = true
       }: {
           query: Record<string, unknown>;
           selectColumns?: string[];
           notSelectedColumns?: string[];
           populate?: boolean;
       }): Promise<FindResult<TicketRow>> {
           return (await super.find({
               query,
               selectColumns,
               notSelectedColumns,
               populate: populate ? this.detailPopulateJoins : [],
           }) )as FindResult<TicketRow>;
       }
    
};
