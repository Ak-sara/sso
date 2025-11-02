import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import { sanitizePaginationParams } from '$lib/utils/pagination';
import { getOrgUnitParentOptions, getOrganizationOptions } from '$lib/utils/select-options';

export const load: PageServerLoad = async ({ url }) => {
	const db = getDB();

	const params = sanitizePaginationParams({
		page: url.searchParams.get('page') || undefined,
		pageSize: url.searchParams.get('pageSize') || undefined,
		sortKey: url.searchParams.get('sortKey') || undefined,
		sortDirection: url.searchParams.get('sortDirection') as 'asc' | 'desc' | undefined,
		search: url.searchParams.get('search') || undefined
	});

	const searchFilter = params.search
		? {
				$or: [
					{ name: { $regex: params.search, $options: 'i' } },
					{ code: { $regex: params.search, $options: 'i' } },
					{ shortName: { $regex: params.search, $options: 'i' } }
				]
		  }
		: {};

	const sortField = params.sortKey || 'sortOrder';
	const sortDir = params.sortDirection === 'desc' ? -1 : 1;
	const skip = (params.page - 1) * params.pageSize;

	const [orgUnits, total, organizationOptions] = await Promise.all([
		db.collection('org_units')
			.find(searchFilter)
			.sort({ [sortField]: sortDir })
			.skip(skip)
			.limit(params.pageSize)
			.toArray(),
		db.collection('org_units').countDocuments(searchFilter),
		getOrganizationOptions()
	]);

	return {
		orgUnits: orgUnits.map((u) => ({
			...u,
			_id: u._id.toString(),
			parentId: u.parentId?.toString() || null,
			organizationId: u.organizationId?.toString() || null,
			managerId: u.managerId?.toString() || null
		})),
		organizationOptions,
		pagination: {
			page: params.page,
			pageSize: params.pageSize,
			total,
			totalPages: Math.ceil(total / params.pageSize)
		}
	};
};
