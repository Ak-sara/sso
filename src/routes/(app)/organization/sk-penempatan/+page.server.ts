import type { PageServerLoad } from './$types';
import { db } from '$lib/db/db';
import { getOrganizationById } from '$lib/services/organization-service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.activeRealmId) throw new Error('No active realm selected');
	const orgResult = await getOrganizationById(locals.activeRealmId);
	if (!orgResult.ok) throw new Error('Organization not found');
	const organization = orgResult.data;

	const params = {
		page: Number(locals.query?.page) || 1,
		pageSize: Number(locals.query?.pageSize) || 10,
		sortKey: locals.query?.sortKey,
		sortDirection: (locals.query?.sortDirection as 'asc' | 'desc') || 'asc',
		search: locals.query?.search
	};

	const result = await db.skPenempatan.findPaginated(
		params,
		{ organizationId: organization._id } as any,
		['skNumber']
	);

	return {
		skList: result.items.map((sk: any) => ({ ...sk, _id: sk._id.toString() })),
		pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages }
	};
};
