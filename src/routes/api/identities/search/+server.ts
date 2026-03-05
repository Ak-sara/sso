import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';
import { json, error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { getMaskedIdentity } from '$lib/utils/data-masking';
import { getMaskingConfig } from '$lib/utils/masking-helper';

// GET /api/identities/search?search=john&identityType=employee&page=1&pageSize=10
export const GET: RequestHandler = async ({ url, locals }) => {
	const db = getDB();
	const search = url.searchParams.get('search') || '';
	const identityType = url.searchParams.get('identityType') || 'employee';
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

	try {
		// Build filter
		const filter: any = {
			identityType,
			isActive: true
		};

		// Add search filter if provided
		if (search) {
			filter.$or = [
				{ fullName: { $regex: search, $options: 'i' } },
				{ firstName: { $regex: search, $options: 'i' } },
				{ lastName: { $regex: search, $options: 'i' } },
				{ email: { $regex: search, $options: 'i' } }
			];

			// Add employeeId search for employees (check both top-level and nested)
			if (identityType === 'employee') {
				filter.$or.push(
					{ employeeId: { $regex: search, $options: 'i' } },
					{ 'employee.employeeId': { $regex: search, $options: 'i' } }
				);
			}
		}

		// Get total count
		const total = await db.collection('identities').countDocuments(filter);

		// Find matching identities with pagination
		const identities = await db
			.collection('identities')
			.find(filter)
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.toArray();

		// Enrich with org unit and position names
		const items = await Promise.all(
			identities.map(async (identity) => {
				let orgUnitName = '';
				let positionName = '';

				// Get org unit name if employee (check both orgUnitId and employee.orgUnitId)
				const orgUnitId = identity.orgUnitId || identity.employee?.orgUnitId;
				if (identity.identityType === 'employee' && orgUnitId && ObjectId.isValid(orgUnitId)) {
					const orgUnit = await db
						.collection('org_units')
						.findOne({ _id: new ObjectId(orgUnitId) });
					orgUnitName = orgUnit?.name || '';
				}

				// Get position name if employee (check both positionId and employee.positionId)
				const positionId = identity.positionId || identity.employee?.positionId;
				if (identity.identityType === 'employee' && positionId && ObjectId.isValid(positionId)) {
					const position = await db
						.collection('positions')
						.findOne({ _id: new ObjectId(positionId) });
					positionName = position?.name || '';
				}

				// Get employeeId (check both top-level and nested)
				const employeeId = identity.employeeId || identity.employee?.employeeId || '';

				return {
					_id: identity._id.toString(),
					employeeId,
					fullName: identity.fullName,
					email: identity.email || '',
					phone: identity.phone || '',
					customProperties: identity.customProperties || {},
					orgUnitName,
					positionName
				};
			})
		);

		// Apply data masking based on user roles
		const maskingConfig = await getMaskingConfig();
		const userRoles = locals.user?.roles || [];
		const maskedItems = items.map((item) => getMaskedIdentity(item, maskingConfig, userRoles));

		return json({
			items: maskedItems,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize)
		});
	} catch (err) {
		console.error('Identity search error:', err);
		throw error(500, 'Failed to search identities');
	}
};
