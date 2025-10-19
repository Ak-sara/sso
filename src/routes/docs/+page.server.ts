import { getPublicDocs, getDocsByCategory } from '$lib/config/docs';
import { getBranding } from '$lib/branding';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const clientId = url.searchParams.get('client_id') || undefined;
	const branding = await getBranding(clientId);

	return {
		docs: getPublicDocs(),
		docsByCategory: getDocsByCategory(),
		branding
	};
};
