import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getOrgUnitParentOptions } from '$lib/utils/select-options';

/**
 * GET /api/org-units/parent-options
 * Fetch parent unit options for dropdown
 * Query params:
 * - currentUnitId: Exclude this unit and its descendants
 * - organizationId: Filter by organization
 */
export const GET: RequestHandler = async ({ url }) => {
	const currentUnitId = url.searchParams.get('currentUnitId') || undefined;
	const organizationId = url.searchParams.get('organizationId') || undefined;

	console.log('[API parent-options] Fetching with:', { currentUnitId, organizationId });

	try {
		const options = await getOrgUnitParentOptions(currentUnitId, organizationId);
		console.log('[API parent-options] Returning', options.length, 'options');
		return json(options);
	} catch (err) {
		console.error('Error fetching parent options:', err);
		return json([], { status: 500 });
	}
};
