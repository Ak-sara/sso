import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';

export const load: PageServerLoad = async () => {
	const db = getDB();
	const partners = await db.collection('partners').find({}).sort({ createdAt: -1 }).toArray();

	return {
		partners: partners.map((p) => ({
			...p,
			_id: p._id.toString(),
			organizationId: p.organizationId?.toString() || null
		})),
	};
};
