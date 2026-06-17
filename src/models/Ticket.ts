import type { TicketRow } from "../interface";
import { BaseModel, Database, parseQueryParams, ValueTypesEnum } from "intellisolar-common"
import type { FindResult, PopulateOption } from "intellisolar-common"
import { TicketStatus } from "../enums/ticket.enum";
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
            select: ['full_name as created_by_name']
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
        const hasVirtualFilters =
            query["overdue"] !== undefined ||
            query["has_feedback"] !== undefined ||
            query["feedback_rating"] !== undefined ||
            query["unassigned"] !== undefined;

        if (!hasVirtualFilters) {
            return super.find({
                query,
                selectColumns,
                notSelectedColumns,
                populate: populate ? this.detailPopulateJoins : [],
            });
        }

        const alias = "t";
        const sortableColumns = this.sortableColumns;
        const queryParams = parseQueryParams(
            {
                page: query["page"],
                limit: query["limit"],
                search: query["search"],
                sort_by: query["sort_by"] ?? "created_at",
                sort_order: query["sort_order"],
            },
            sortableColumns,
        );
        const normalizedQueryParams = {
            ...queryParams,
            search: queryParams.search ?? "",
            sort_order: queryParams.sort_order === "ASC" ? "ASC" as const : "DESC" as const,
        };

        const baseColumns = selectColumns?.length ? selectColumns : this.listColumns;
        const selectedColumns = this.applyNotSelectedColumns(baseColumns, notSelectedColumns);
        const validColumns = this.validateColumns(selectedColumns);
        let selectSql = validColumns.map((column) => `${alias}."${column}"`).join(", ");

        const populateJoins = populate ? this.validatePopulate(this.detailPopulateJoins) : [];
        let joinSql = "";
        populateJoins.forEach((join, index) => {
            const joinAlias = `p${index}`;
            joinSql += ` LEFT JOIN "${join.table}" ${joinAlias} ON ${joinAlias}."${join.foreignKey}" = ${alias}."${join.localKey}"`;
            join.select.forEach((selection) => {
                const [column, outputName] = selection.split(/\s+as\s+/i).map((item) => item.trim());
                selectSql += outputName ? `, ${joinAlias}."${column}" AS "${outputName}"` : `, ${joinAlias}."${column}"`;
            });
        });

        const values: unknown[] = [];
        const where: string[] = [];
        let index = 1;

        const searchableColumns = this.searchableColumns.filter((column) => this.allowedColumns.includes(column));
        if (normalizedQueryParams.search.trim() && searchableColumns.length) {
            where.push(`(${searchableColumns.map((column) => `${alias}."${column}" ILIKE $${index}`).join(" OR ")})`);
            values.push(`%${normalizedQueryParams.search.trim()}%`);
            index++;
        }

        const addEqualFilter = (column: string) => {
            const value = query[column];
            if (value === undefined || value === null || value === "") return;

            const valuesToFilter = Array.isArray(value)
                ? value
                : typeof value === "string" && value.includes(",")
                    ? value.split(",").map((item) => item.trim()).filter(Boolean)
                    : [value];


            if (valuesToFilter.length === 1) {
                where.push(`${alias}."${column}" = $${index++}`);
                values.push(valuesToFilter[0]);
                return;
            }

            where.push(`${alias}."${column}" = ANY($${index++})`);
            values.push(valuesToFilter);
        };
        [
            "id",
            "ticket_number",
            "status",
            "priority",
            "plant_id",
            "component_type_id",
            "component_id",
            "assigned_to",
            "assigned_by",
            "created_by",
            "updated_by",
            "resolve_at",
            "due_date",
        ].forEach(addEqualFilter);

        const addDateRange = (column: "created_at" | "updated_at", fromKey: string, toKey: string) => {
            const from = query[fromKey];
            const to = query[toKey];
            if (from) {
                where.push(`${alias}."${column}" >= $${index++}`);
                values.push(from);
            }
            if (to) {
                where.push(`${alias}."${column}" <= $${index++}`);
                values.push(to);
            }
        };

        addDateRange("created_at", "created_from", "created_to");
        addDateRange("updated_at", "updated_from", "updated_to");
        addDateRange("created_at", "start_date", "end_date");

        const terminalStatuses = [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELED];
        const overdueCondition = `${alias}."status"::text <> ALL($${index}::text[]) AND ${alias}."created_at" < NOW() - INTERVAL '3 days'`;
        if (query["overdue"] === true || query["overdue"] === "true") {
            where.push(overdueCondition);
            values.push(terminalStatuses);
            index++;
        } else if (query["overdue"] === false || query["overdue"] === "false") {
            where.push(`NOT (${overdueCondition})`);
            values.push(terminalStatuses);
            index++;
        }

        if (query["has_feedback"] === true || query["has_feedback"] === "true") {
            where.push(`${alias}."feedback" IS NOT NULL`);
        } else if (query["has_feedback"] === false || query["has_feedback"] === "false") {
            where.push(`${alias}."feedback" IS NULL`);
        }

        if (query["feedback_rating"] !== undefined && query["feedback_rating"] !== null && query["feedback_rating"] !== "") {
            where.push(`(${alias}."feedback"->>'rating')::int = $${index++}`);
            values.push(Number(query["feedback_rating"]));
        }

        if (query["unassigned"] === true || query["unassigned"] === "true") {
            where.push(`${alias}."assigned_to" IS NULL`);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const sortBy = sortableColumns.includes(normalizedQueryParams.sort_by) ? normalizedQueryParams.sort_by : "created_at";
        const sortField = this.fieldMap[sortBy];
        const sortSql = sortField?.type === ValueTypesEnum.STRING ? `LOWER(${alias}."${sortBy}")` : `${alias}."${sortBy}"`;
        const offset = (normalizedQueryParams.page - 1) * normalizedQueryParams.limit;

        const listSql = `
            SELECT ${selectSql}
            FROM "${this.tableName}" ${alias}
            ${joinSql}
            ${whereSql}
            ORDER BY ${sortSql} ${normalizedQueryParams.sort_order}
            LIMIT $${index++} OFFSET $${index++}
        `;
        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM "${this.tableName}" ${alias}
            ${whereSql}
        `;

        const [listResult, countResult] = await Promise.all([
            Database.query<TicketRow>(listSql, [...values, normalizedQueryParams.limit, offset]),
            Database.query<{ total: number }>(countSql, values),
        ]);

        return {
            data: listResult.rows,
            total: countResult.rows[0]?.total ?? 0,
            queryParams: normalizedQueryParams,
            filters: query,
        };
    }
    
};
