import { CommentsRow } from "../interface";
import { BaseModel, FindResult, PopulateOption } from "intellisolar-common"
import { commentFieldConfigs } from "../valid-fields";

export class Comment extends BaseModel {

    protected static override tableName = "comments";

    static override fieldConfigs = commentFieldConfigs;

    static override allowedPopulate = {
        users: ["id", "full_name"],
        tickets : ["id" , "ticket_number"]
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
            select: ['*']
        }
    ];

    static override async find({
        query,
        selectColumns,
        notSelectedColumns,
        populate = true
    }: {
        query: Record<string, any>;
        selectColumns?: string[];
        notSelectedColumns?: string[];
        populate?: boolean;
    }): Promise<FindResult<CommentsRow>> {
        return super.find({
            query,
            selectColumns,
            notSelectedColumns,
            populate: populate ? this.detailPopulateJoins : [],
        });
    }
};
