import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAuditLogById } from '$lib/services/audit-service';

export const load: PageServerLoad = async ({ params }) => {
	const result = await getAuditLogById(params.id);
	if (!result) throw error(404, 'Log audit tidak ditemukan');
	return result;
};
