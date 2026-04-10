import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getOrgUnitById, updateOrgUnit, deleteOrgUnit } from '$lib/services/org-unit-service';

export const GET: RequestHandler = async ({ params }) => {
	const result = await getOrgUnitById(params.code);
	if (!result.ok) throw error(result.status ?? 404, result.error);
	return json(result.data);
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	try {
		const body = locals.body as {};
		const result = await updateOrgUnit(locals.routes.code, body);
		if (!result.ok) throw error(result.status ?? 400, result.error);
		return json({ success: true });
	} catch (err) {
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to update organization unit');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const result = await deleteOrgUnit(params.code);
		if (!result.ok) throw error(result.status ?? 400, result.error);
		return json({ success: true });
	} catch (err) {
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to delete organization unit');
	}
};
