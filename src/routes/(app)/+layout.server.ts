import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getBrandingByOrganization, getBranding } from '$lib/branding';
import { listActiveOrgs } from '$lib/services/organization-service';
import { getIdentityById } from '$lib/services/identity-service';
import { isRestrictedUser, isPathAllowedForRestrictedUser } from '$lib/auth/access-control';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${url.pathname}`);
	}

	const user = locals.user;

	if (isRestrictedUser(user.roles) && !isPathAllowedForRestrictedUser(url.pathname)) {
		throw redirect(302, '/profile');
	}

	const isAdmin = user.roles?.includes('admin') || user.roles?.includes('superadmin');

	const allOrgs = await listActiveOrgs();

	let accessibleRealms: typeof allOrgs;
	if (isAdmin) {
		accessibleRealms = allOrgs;
	} else {
		const identityResult = user.userId ? await getIdentityById(user.userId) : null;
		const allowedIds = new Set<string>();

		if (user.organizationId) allowedIds.add(user.organizationId);

		if (identityResult?.ok && (identityResult.data as any).secondaryAssignments) {
			for (const sa of (identityResult.data as any).secondaryAssignments) {
				const orgId = sa.organizationId?.toString();
				if (orgId) allowedIds.add(orgId);
			}
		}

		accessibleRealms = allOrgs.filter(org => allowedIds.has(org._id));
	}

	const realms = accessibleRealms;

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
