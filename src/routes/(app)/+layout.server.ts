import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getBranding } from '$lib/branding';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${url.pathname}`);
	}

	// Load branding (will use default/MASTER if no specific branding found)
	const branding = await getBranding();

	return {
		user: locals.user,
		branding,
	};
};
