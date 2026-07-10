import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';
import { json, error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { sanitizeString } from '@ak-sara/fbao/foundation/sanitize';
import { getOrgUnitDescendants } from '$lib/db/schemas/org-unit';

// GET /api/org-units/search?search=division&organizationId=xxx&currentUnitId=xxx&page=1&pageSize=10
export const GET: RequestHandler = async ({ locals }) => {
	const search = sanitizeString(locals.query?.search || '');
	const organizationId = locals.query?.organizationId;
	const currentUnitId = locals.query?.currentUnitId;
	const page = parseInt(locals.query?.page || '1');
	const pageSize = parseInt(locals.query?.pageSize || '10');

	try {
		const filter: any = { isActive: true };

		if (search) {
			filter.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ code: { $regex: search, $options: 'i' } }
			];
		}

		if (organizationId && ObjectId.isValid(organizationId)) {
			filter.organizationId = new ObjectId(organizationId);
		}

		const [allUnits, total] = await Promise.all([
			db.orgUnits.col.find(filter).skip((page - 1) * pageSize).limit(pageSize).toArray(),
			db.orgUnits.count(filter)
		]);

		let orgUnits = allUnits;
		if (currentUnitId && ObjectId.isValid(currentUnitId)) {
			const descendants = await getOrgUnitDescendants(currentUnitId);
			const excludeIds = new Set([currentUnitId, ...descendants]);
			orgUnits = allUnits.filter((unit: any) => !excludeIds.has(unit._id.toString()));
		}

		return json({
			items: orgUnits.map((unit: any) => ({
				_id: unit._id.toString(),
				code: unit.code,
				name: unit.name,
				type: unit.type,
				level: unit.level || 0
			})),
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize)
		});
	} catch (err) {
		throw error(500, 'Failed to search org units');
	}
};
