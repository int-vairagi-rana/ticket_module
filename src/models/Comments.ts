import { type CommentsRow } from "../interface";
import type  { FindResult ,  PopulateOption } from "intellisolar-common"
import { BaseModel } from "intellisolar-common";
import { commentFieldConfigs } from "../valid-fields";

export class Comment extends BaseModel {

    protected static override tableName = "comments";

    static override fieldConfigs = commentFieldConfigs;

    static override allowedPopulate = {
        users: ["id", "full_name"],
        tickets : ["id" ]
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
            table: 'tickets',
            localKey: 'entity_id',
            foreignKey: 'id',
            select: ['id as ticket_id']
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
    }): Promise<FindResult<CommentsRow>> {
        return (await super.find({
            query,
            selectColumns,
            notSelectedColumns,
            populate: populate ? this.detailPopulateJoins : [],
        })) as FindResult<CommentsRow>;
    }
};
