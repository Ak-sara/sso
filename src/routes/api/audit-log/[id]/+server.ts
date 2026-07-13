import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuditLogById } from '$lib/services/audit-service';

// GET /api/audit-log/[id] — backs the audit detail modal
export const GET: RequestHandler = async ({ params }) => {
	const result = await getAuditLogById(params.id);
	if (!result) throw error(404, 'Log audit tidak ditemukan');
	return json(result);
};
