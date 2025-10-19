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
					{ action: { $regex: params.search, $options: 'i' } },
					{ userId: { $regex: params.search, $options: 'i' } },
					{ targetType: { $regex: params.search, $options: 'i' } },
					{ details: { $regex: params.search, $options: 'i' } }
				]
		  }
		: {};

	const sortField = params.sortKey || 'timestamp';
	const sortDir = params.sortDirection === 'desc' ? -1 : 1;
	const skip = (params.page - 1) * params.pageSize;

	const [auditLogs, total] = await Promise.all([
		db.collection('audit_logs')
			.find(searchFilter)
			.sort({ [sortField]: sortDir })
			.skip(skip)
			.limit(params.pageSize)
			.toArray(),
		db.collection('audit_logs').countDocuments(searchFilter)
	]);

	return {
		auditLogs: auditLogs.map((log) => ({
			...log,
			_id: log._id.toString(),
			timestamp: log.timestamp.toISOString()
		})),
		pagination: {
			page: params.page,
			pageSize: params.pageSize,
			total,
			totalPages: Math.ceil(total / params.pageSize)
		}
	};
};
