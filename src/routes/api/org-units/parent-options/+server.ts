import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getOrgUnitParentOptions } from '$lib/utils/select-options';
import { useLogger } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'api:org-units' });

/**
 * GET /api/org-units/parent-options
 * Fetch parent unit options for dropdown
 * Query params:
 * - currentUnitId: Exclude this unit and its descendants
 * - organizationId: Filter by organization
 */
export const GET: RequestHandler = async ({ locals }) => {
	const currentUnitId = locals.query?.currentUnitId || undefined;
	const organizationId = locals.query?.organizationId || undefined;

	log.debug('Fetching parent options', { currentUnitId, organizationId });

	try {
		const options = await getOrgUnitParentOptions(currentUnitId, organizationId);
		log.debug('Returning parent options', { count: options.length });
		return json(options);
	} catch (err) {
		log.error('Error fetching parent options', { error: err });
		return json([], { status: 500 });
	}
};
