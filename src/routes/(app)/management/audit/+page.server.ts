import type { PageServerLoad } from './$types';
import { listAuditLogs } from '$lib/services/audit-service';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:pagination');
	const params = {
		page: Number(locals.query?.page) || 1,
		pageSize: Number(locals.query?.pageSize) || 10,
		sortKey: locals.query?.sortKey,
		sortDirection: (locals.query?.sortDirection as 'asc' | 'desc') || 'asc',
		search: locals.query?.search
	};

	const result = await listAuditLogs(params);
	return { auditLogs: result.items, pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages } };
};
