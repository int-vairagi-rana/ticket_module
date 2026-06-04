import express, { NextFunction, Request, Response } from 'express';
import { getSpecificPlantValidation } from './get-specific-plant.validation';
import { isAuthenticated, isAuthorized, responseHandler, validateRequest } from 'intellisolar-common';
import { PlantRow } from '../../../interface';
import { UserRole } from 'intellisolar-common';
import { Plant } from '../../../models';
import { logger, NotFoundError, CacheManager, AppError } from "intellisolar-common"

const router = express.Router();

// Get plant id from the request parameters and ensure the user has permission to access it.
// Attempt to fetch the scoped plant details including owner and tenant information from the cache or database.
// Return a not found error if the plant does not exist or the user lacks access.
// Return a success response with all the relevant plant details configured for the user.

router.get(
    '/v1/plant/:id',
    responseHandler,
    isAuthenticated,
    isAuthorized("get-specific-plant"),
    getSpecificPlantValidation,
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = (req.params["id"] as string).trim();
            const currentUser = req.currentUser!;

            if (currentUser.role === UserRole.User && !currentUser.plant_ids.includes(id)) {
                throw new NotFoundError();
            }

            const params: Partial<PlantRow> & { tenant_id?: string, is_active?: boolean } = { id };

            if (currentUser.role === UserRole.Tenant || currentUser.role === UserRole.User) {
                if (!currentUser.tenant_id) throw new AppError("You are not authorized to access this resource", 403);
                params.tenant_id = currentUser.tenant_id!;
                params.is_active = true;
            }

            const plant = await CacheManager.getOrSet({
                key: `plant:${id}`,
                fetcher: async () => {
                    const plant = await Plant.findOne<PlantRow>({
                        where: params,
                        populate: Plant.detailPopulateJoins
                    });

                    if (!plant) throw new NotFoundError();

                    return plant;
                }
            });

            const plantObj = {
                id: plant.id,
                tenant_id: plant.tenant_id,
                organization_id: plant.organization_id,
                plant_name: plant.plant_name,
                plant_type: plant.plant_type,
                plant_category: plant.plant_category,
                owner: plant.owner,
                ...(
                    (currentUser.role === UserRole.SuperAdmin || currentUser.role === UserRole.Admin) && {
                        is_forecast: plant.is_forecast,
                        metadata: plant.metadata
                    }
                ),
                contact_person_name: plant.contact_person_name,
                contact_person_email: plant.contact_person_email,
                contact_person_phone: plant.contact_person_phone,
                contact_person_designation: plant.contact_person_designation,
                dc_capacity_kw: plant.dc_capacity_kw,
                ac_capacity_kw: plant.ac_capacity_kw,
                sanctioned_load_kw: plant.sanctioned_load_kw,
                connected_load_kw: plant.connected_load_kw,
                grid_voltage_kv: plant.grid_voltage_kv,
                connection_point: plant.connection_point,
                transformer_capacity_kva: plant.transformer_capacity_kva,
                meter_number: plant.meter_number,
                consumer_number: plant.consumer_number,
                feeder_name: plant.feeder_name,
                substation_name: plant.substation_name,
                discom_name: plant.discom_name,
                location_name: plant.location_name,
                address: plant.address,
                city: plant.city,
                district: plant.district,
                taluka: plant.taluka,
                state: plant.state,
                country: plant.country,
                pincode: plant.pincode,
                latitude: plant.latitude,
                longitude: plant.longitude,
                elevation_m: plant.elevation_m,
                timezone: plant.timezone,
                grid_type: plant.grid_type,
                net_metering: plant.net_metering,
                commissioning_date: plant.commissioning_date,
                cod_date: plant.cod_date,
                ppa_rate: plant.ppa_rate,
                ppa_escalation_percent: plant.ppa_escalation_percent,
                ppa_duration_years: plant.ppa_duration_years,
                revenue_type: plant.revenue_type,
                tariff_type: plant.tariff_type,
                expected_annual_generation_kwh: plant.expected_annual_generation_kwh,
                expected_cuf_percent: plant.expected_cuf_percent,
                expected_pr_percent: plant.expected_pr_percent,
                expected_yield_kwh_kwp: plant.expected_yield_kwh_kwp,
                module_json: plant.module_json,
                tilt_angle_degrees: plant.tilt_angle_degrees,
                azimuth_angle_degrees: plant.azimuth_angle_degrees,
                orientation: plant.orientation,
                notify_users: plant.notify_users,
                features: plant.features,
                is_active: plant.is_active,
                is_commissioned: plant.is_commissioned,
                plant_image: plant.plant_image,
                tags: plant.tags,
                tenant_name: plant.tenant_name,
                organization_name: plant.organization_name,
                created_by_name: plant.created_by_name,
                updated_by_name: plant.updated_by_name,
                created_by: plant.created_by,
                updated_by: plant.updated_by,
                created_at: plant.created_at,
                updated_at: plant.updated_at
            };

            res.sendResponse(
                plantObj,
                200,
                {
                    targetType: 'Plant',
                    targetId: plant.id,
                    action: 'get-specific-plan'
                }
            );
        } catch (error: any) {
            logger.error(`Get specific plant error: ${error.message}`);
            return next(error);
        }
    }
);

export { router as getSpecificPlantV1Router };
