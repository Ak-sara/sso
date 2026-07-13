import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';

// GET /api/client-roles?clientId=xxx — list App Roles for one OAuth client
export const GET: RequestHandler = async ({ url }) => {
	const clientId = url.searchParams.get('clientId');
	if (!clientId) throw error(400, 'clientId query param is required');

	const roles = await db.clientRoles.find({ clientId } as any, { name: 1 });
	return json(roles.map((r: any) => ({ _id: r._id.toString(), name: r.name, description: r.description })));
};
