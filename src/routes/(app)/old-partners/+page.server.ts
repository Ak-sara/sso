import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import { sanitizePaginationParams } from '$lib/utils/pagination';

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
					{ contactName: { $regex: params.search, $options: 'i' } },
					{ partnerId: { $regex: params.search, $options: 'i' } },
					{ email: { $regex: params.search, $options: 'i' } },
					{ companyName: { $regex: params.search, $options: 'i' } }
				]
		  }
		: {};

	const sortField = params.sortKey || 'createdAt';
	const sortDir = params.sortDirection === 'desc' ? -1 : 1;
	const skip = (params.page - 1) * params.pageSize;

	const [partners, total] = await Promise.all([
		db.collection('partners')
			.find(searchFilter)
			.sort({ [sortField]: sortDir })
			.skip(skip)
			.limit(params.pageSize)
			.toArray(),
		db.collection('partners').countDocuments(searchFilter)
	]);

	return {
		partners: partners.map((p) => ({
			...p,
			_id: p._id.toString(),
			organizationId: p.organizationId?.toString() || null
		})),
		pagination: {
			page: params.page,
			pageSize: params.pageSize,
			total,
			totalPages: Math.ceil(total / params.pageSize)
		}
	};
};
