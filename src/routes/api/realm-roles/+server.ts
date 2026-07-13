import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';

// GET /api/realm-roles?organizationId=xxx — list Realm Roles for one organization
export const GET: RequestHandler = async ({ url }) => {
	const organizationId = url.searchParams.get('organizationId');
	if (!organizationId) throw error(400, 'organizationId query param is required');

	const roles = await db.realmRoles.find({ organizationId } as any, { name: 1 });
	return json(roles.map((r: any) => ({
		_id: r._id.toString(),
		organizationId: r.organizationId,
		name: r.name,
		description: r.description,
		allowedClientIds: r.allowedClientIds || [],
		isActive: r.isActive
	})));
};
