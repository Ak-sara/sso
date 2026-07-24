import { getIdentityById } from '$lib/services/identity-service';
import { isRestrictedUser } from '$lib/auth/access-control';

/**
 * Realm IDs a user may view: 'all' for admins, otherwise their primary org
 * plus any secondary assignments. Used to gate both the realm switcher and
 * any endpoint that lets a user pick which realm's data to load.
 */
export async function getAccessibleRealmIds(
	user: { userId?: string; organizationId?: string; roles?: string[] } | undefined
): Promise<'all' | Set<string>> {
	if (!user) return new Set<string>();
	if (!isRestrictedUser(user.roles)) return 'all';

	const allowedIds = new Set<string>();
	if (user.organizationId) allowedIds.add(user.organizationId);

	const identityResult = user.userId ? await getIdentityById(user.userId) : null;
	if (identityResult?.ok && (identityResult.data as any).secondaryAssignments) {
		for (const sa of (identityResult.data as any).secondaryAssignments) {
			const orgId = sa.organizationId?.toString();
			if (orgId) allowedIds.add(orgId);
		}
	}
	return allowedIds;
}
