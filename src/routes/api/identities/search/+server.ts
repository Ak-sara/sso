import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';
import { json, error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { getMaskedIdentity } from '$lib/utils/data-masking';
import { getMaskingConfig } from '$lib/utils/masking-helper';

// GET /api/identities/search?search=john&identityType=employee&page=1&pageSize=10
export const GET: RequestHandler = async ({ locals }) => {
	const search = locals.query?.search || '';
	const identityType = locals.query?.identityType || 'employee';
	const page = parseInt(locals.query?.page || '1');
	const pageSize = parseInt(locals.query?.pageSize || '10');

	try {
		const filter: any = { identityType, isActive: true };

		if (search) {
			filter.$or = [
				{ fullName: { $regex: search, $options: 'i' } },
				{ firstName: { $regex: search, $options: 'i' } },
				{ lastName: { $regex: search, $options: 'i' } },
				{ email: { $regex: search, $options: 'i' } }
			];
			if (identityType === 'employee') {
				filter.$or.push({ employeeId: { $regex: search, $options: 'i' } });
			}
		}

		const [identities, total] = await Promise.all([
			db.identities.col.find(filter).skip((page - 1) * pageSize).limit(pageSize).toArray(),
			db.identities.count(filter)
		]);

		const items = await Promise.all(
			identities.map(async (identity: any) => {
				let orgUnitName = '';
				let positionName = '';

				const orgUnitId = identity.orgUnitId;
				if (identity.identityType === 'employee' && orgUnitId && ObjectId.isValid(orgUnitId)) {
					const orgUnit = await db.orgUnits.findById(orgUnitId.toString()) as any;
					orgUnitName = orgUnit?.name || '';
				}

				const positionId = identity.positionId;
				if (identity.identityType === 'employee' && positionId && ObjectId.isValid(positionId)) {
					const position = await db.positions.findById(positionId.toString()) as any;
					positionName = position?.name || '';
				}

				return {
					_id: identity._id.toString(),
					employeeId: identity.employeeId || '',
					fullName: identity.fullName,
					email: identity.email || '',
					phone: identity.phone || '',
					customProperties: identity.customProperties || {},
					orgUnitName,
					positionName
				};
			})
		);

		const maskingConfig = await getMaskingConfig();
		const userRoles = locals.user?.roles || [];
		const maskedItems = items.map((item) => getMaskedIdentity(item, maskingConfig, userRoles));

		return json({ items: maskedItems, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
	} catch (err) {
		throw error(500, 'Failed to search identities');
	}
};
