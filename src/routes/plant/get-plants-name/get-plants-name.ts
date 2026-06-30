import express, { NextFunction, Request, Response } from "express";
import { getPlantsNameValidation } from "./get-plants-name.validation";
import { isAuthenticated, isAuthorized, responseHandler, User, validateRequest } from "intellisolar-common";
import { UserRole } from "intellisolar-common";
import { UserRow } from "intellisolar-common";
import { Plant } from "../../../models";
import { AppError, logger } from "intellisolar-common";

const router = express.Router();

// Get pagination, search, and user/tenant parameters from request query.
// Initialize the base query to fetch only plant IDs and names.
// If current user is a User, only fetch names for their assigned plant IDs from cache/database.
// If current user is a Tenant, dynamically scope the request and return tenant specific or user specific plant IDs.
// If current user is Admin or SuperAdmin, fetch system-wide or dynamically scoped plant IDs based on request parameters.
// Return a success response with the scoped list of plant names.

router.get(
    "/v1/plants/name",
    responseHandler,
    isAuthenticated,
    isAuthorized("get-plants-name"),
    getPlantsNameValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 100, search = '', user_id, tenant_id } = req.query;
            const currentUser = req.currentUser!;

            const baseQuery: Record<string, any> = { page, limit, search, is_active: true };

            const SELECT_COLS = ["id", "plant_name"];

            // Role: user can only see their own assigned plants; extra params are ignored
            if (currentUser.role === UserRole.User) {
                const plantIds = currentUser.plant_ids ?? [];

                if (plantIds.length === 0) {
                    return res.sendResponse(
                        {
                            plants: [],
                            pagination: {
                                page,
                                limit,
                                totalCount: 0,
                                totalPages: 0
                            }
                        },
                        204,
                        {
                            targetType: "Plant",
                            action: "GET_PLANTS_NAME"
                        }
                    );
                }

                const result = await Plant.find({
                    query: { ...baseQuery, id: plantIds },
                    selectColumns: SELECT_COLS,
                    populate: false,
                });

                return res.sendResponse(
                    {
                        plants: result.data,
                        pagination: {
                            page: result.queryParams.page,
                            limit: result.queryParams.limit,
                            totalCount: result.total,
                            totalPages: Math.ceil(result.total / result.queryParams.limit),
                        }
                    },
                    result.data.length === 0 ? 204 : 200,
                    {
                        targetType: "Plant",
                        action: "GET_PLANTS_NAME"
                    }
                );
            }

            // Role: Tenant
            if (currentUser.role === UserRole.Tenant) {
                if (!currentUser.tenant_id) {
                    throw new AppError("You are not authorized to access this resource.", 403);
                }

                if (user_id) {
                    // Scope to a specific user — user must belong to this tenant
                    const user = await User.findOne<UserRow>({
                        where: { id: user_id, is_active: true, tenant_id: currentUser.tenant_id },
                        select: ["id", "tenant_id", "plant_ids"]
                    });

                    if (!user) {
                        throw new AppError("user not found or invalid user id", 400);
                    }

                    const plantIds = user.plant_ids ?? [];
                    if (plantIds.length === 0) {
                        return res.sendResponse(
                            {
                                plants: [],
                                pagination: {
                                    page,
                                    limit,
                                    totalCount: 0,
                                    totalPages: 0
                                }
                            },
                            204,
                            {
                                targetType: "Plant",
                                action: "GET_PLANTS_NAME"
                            }
                        )
                    }

                    const result = await Plant.find({
                        query: { ...baseQuery, id: plantIds, tenant_id: currentUser.tenant_id },
                        selectColumns: SELECT_COLS,
                        tenantScoped: true,
                        tenantId: currentUser.tenant_id,
                        populate: false
                    });

                    return res.sendResponse(
                        {
                            plants: result.data,
                            pagination: {
                                page: result.queryParams.page,
                                limit: result.queryParams.limit,
                                totalCount: result.total,
                                totalPages: Math.ceil(result.total / result.queryParams.limit)
                            }
                        },
                        result.data.length === 0 ? 204 : 200,
                        {
                            targetType: "Plant",
                            action: "GET_PLANTS_NAME"
                        }
                    );
                }

                // Default: all plants under the tenant
                const result = await Plant.find({
                    query: {
                        ...baseQuery,
                        tenant_id: currentUser.tenant_id
                    },
                    selectColumns: SELECT_COLS,
                    tenantScoped: true,
                    tenantId: currentUser.tenant_id,
                    populate: false
                });

                return res.sendResponse(
                    {
                        plants: result.data,
                        pagination: {
                            page: result.queryParams.page,
                            limit: result.queryParams.limit,
                            totalCount: result.total,
                            totalPages: Math.ceil(result.total / result.queryParams.limit)
                        }
                    },
                    result.data.length === 0 ? 204 : 200,
                    {
                        targetType: "Plant",
                        action: "GET_PLANTS_NAME"
                    }
                );
            }

            // Role: Admin or SuperAdmin
            if (currentUser.role === UserRole.Admin || currentUser.role === UserRole.SuperAdmin) {
                if (tenant_id && user_id) {
                    const user = await User.findOne<UserRow>({
                        where: { id: user_id, is_active: true, tenant_id },
                        select: ["id", "tenant_id", "plant_ids"]
                    });

                    if (!user) {
                        throw new AppError("user not found or invalid user id", 400);
                    }

                    const plantIds = user.plant_ids ?? [];
                    if (plantIds.length === 0) {
                        return res.sendResponse(
                            {
                                plants: [],
                                pagination: {
                                    page,
                                    limit,
                                    totalCount: 0,
                                    totalPages: 0
                                }
                            },
                            204,
                            {
                                targetType: "Plant",
                                action: "GET_PLANTS_NAME"
                            }
                        )
                    }

                    const result = await Plant.find({
                        query: { ...baseQuery, id: plantIds, tenant_id },
                        selectColumns: SELECT_COLS,
                        tenantScoped: true,
                        tenantId: tenant_id as string,
                        populate: false
                    });

                    return res.sendResponse(
                        {
                            plants: result.data,
                            pagination: {
                                page: result.queryParams.page,
                                limit: result.queryParams.limit,
                                totalCount: result.total,
                                totalPages: Math.ceil(result.total / result.queryParams.limit)
                            }
                        },
                        result.data.length === 0 ? 204 : 200,
                        {
                            targetType: "Plant",
                            action: "GET_PLANTS_NAME"
                        }
                    );
                }

                // Only user_id → return that user's plants (no tenant constraint)
                if (user_id) {
                    const user = await User.findOne<UserRow>({
                        where: { id: user_id, is_active: true },
                        select: ["id", "tenant_id", "plant_ids"]
                    });

                    if (!user) {
                        throw new AppError("user not found or invalid user id", 400);
                    }

                    const plantIds = user.plant_ids ?? [];
                    if (plantIds.length === 0) {
                        return res.sendResponse(
                            {
                                plants: [],
                                pagination: {
                                    page,
                                    limit,
                                    totalCount: 0,
                                    totalPages: 0
                                }
                            },
                            204,
                            {
                                targetType: "Plant",
                                action: "GET_PLANTS_NAME"
                            }
                        )
                    }

                    const result = await Plant.find({
                        query: { ...baseQuery, id: plantIds, tenant_id: user.tenant_id },
                        selectColumns: SELECT_COLS,
                        populate: false
                    });

                    return res.sendResponse(
                        {
                            plants: result.data,
                            pagination: {
                                page: result.queryParams.page,
                                limit: result.queryParams.limit,
                                totalCount: result.total,
                                totalPages: Math.ceil(result.total / result.queryParams.limit)
                            }
                        },
                        result.data.length === 0 ? 204 : 200,
                        { targetType: "Plant", action: "GET_PLANTS_NAME" }
                    );
                }

                // Only tenant_id → all plants under that tenant
                if (tenant_id) {
                    const result = await Plant.find({
                        query: { ...baseQuery, tenant_id },
                        selectColumns: SELECT_COLS,
                        tenantScoped: true,
                        tenantId: tenant_id as string,
                        populate: false
                    });

                    return res.sendResponse(
                        {
                            plants: result.data,
                            pagination: {
                                page: result.queryParams.page,
                                limit: result.queryParams.limit,
                                totalCount: result.total,
                                totalPages: Math.ceil(result.total / result.queryParams.limit)
                            }
                        },
                        result.data.length === 0 ? 204 : 200,
                        {
                            targetType: "Plant",
                            action: "get-plants-name"
                        }
                    );
                }

                // Default: all active plants across the system
                const result = await Plant.find({
                    query: { ...baseQuery },
                    selectColumns: SELECT_COLS,
                    populate: false
                });

                return res.sendResponse(
                    {
                        plants: result.data,
                        pagination: {
                            page: result.queryParams.page,
                            limit: result.queryParams.limit,
                            totalCount: result.total,
                            totalPages: Math.ceil(result.total / result.queryParams.limit),
                        }
                    },
                    result.data.length === 0 ? 204 : 200,
                    {
                        targetType: "Plant",
                        action: "GET_PLANTS_NAME"
                    }
                );
            }

            // Fallback — unknown role
            throw new AppError("You are not authorized to access this resource.", 403);

        } catch (err: unknown) {
            logger.error(`Error listing plant names: ${(err as Error).message}`);
            return next(err);
        }
    }
);

export { router as getPlantsNameV1Router };
