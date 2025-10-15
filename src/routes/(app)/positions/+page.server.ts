import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';

export const load: PageServerLoad = async () => {
	const db = getDB();
	const positions = await db.collection('positions').find({}).sort({ level: 1, name: 1 }).toArray();

	return {
		positions: positions.map((p) => ({
			...p,
			_id: p._id.toString(),
			organizationId: p.organizationId?.toString() || null
		})),
	};
};
