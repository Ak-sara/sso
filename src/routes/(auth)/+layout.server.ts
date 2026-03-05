import { getBranding } from '$lib/branding';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url }) => {
	// Get client_id from query params if present (for OAuth flow)
	const clientId = url.searchParams.get('client_id') || undefined;

	// Load branding configuration
	const branding = await getBranding(clientId);

	return {
		branding
	};
};
