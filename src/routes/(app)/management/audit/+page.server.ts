import type { PageServerLoad } from './$types';
import { sanitizePaginationParams } from '$lib/utils/pagination';
import { listAuditLogs } from '$lib/services/audit-service';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:pagination');
	const params = sanitizePaginationParams({
		page: Number(locals.query?.page) || undefined,
		pageSize: Number(locals.query?.pageSize) || undefined,
		sortKey: locals.query?.sortKey || undefined,
		sortDirection: locals.query?.sortDirection as 'asc' | 'desc' | undefined,
		search: locals.query?.search || undefined
	});

	const result = await listAuditLogs(params);
	return { auditLogs: result.items, pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages } };
};
