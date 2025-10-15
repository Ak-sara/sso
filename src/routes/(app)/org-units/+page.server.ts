import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';

export const load: PageServerLoad = async () => {
	const db = getDB();
	const orgUnits = await db.collection('org_units').find({}).sort({ sortOrder: 1 }).toArray();

	return {
		orgUnits: orgUnits.map((u) => ({
			...u,
			_id: u._id.toString(),
			parentId: u.parentId?.toString() || null,
			organizationId: u.organizationId?.toString() || null,
			managerId: u.managerId?.toString() || null
		})),
	};
};
