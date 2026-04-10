import { getBranding } from '$lib/branding';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Get client_id from query params if present (for OAuth flow)
	const clientId = locals.query?.client_id || undefined;

	// Load branding configuration
	const branding = await getBranding(clientId);

	return {
		branding
	};
};
