import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getBrandingByOrganization, getBranding } from '$lib/branding';
import { listActiveOrgs } from '$lib/services/organization-service';
import { isRestrictedUser, isPathAllowedForRestrictedUser } from '$lib/auth/access-control';
import { getAccessibleRealmIds } from '$lib/auth/access-control.server';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${url.pathname}`);
	}

	const user = locals.user;

	if (isRestrictedUser(user.roles) && !isPathAllowedForRestrictedUser(url.pathname)) {
		throw redirect(302, '/profile');
	}

	const allOrgs = await listActiveOrgs();

	const accessible = await getAccessibleRealmIds(user);
	const realms = accessible === 'all' ? allOrgs : allOrgs.filter(org => accessible.has(org._id));

	let activeRealmId = locals.activeRealmId;
	if (!activeRealmId || !realms.find(r => r._id === activeRealmId)) {
		activeRealmId = user.organizationId || realms[0]?._id || undefined;
	}

	const activeRealm = realms.find(r => r._id === activeRealmId) || realms[0] || null;

	const branding = activeRealmId
		? await getBrandingByOrganization(activeRealmId)
		: await getBranding();

	return { user, branding, realms, activeRealm };
};
