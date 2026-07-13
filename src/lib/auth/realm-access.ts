/**
 * Realm Role / Client Role enforcement — gates which OAuth clients an
 * identity may authenticate to, and resolves in-app permission claims.
 *
 * Scoped to assignments[] (not the top-level org fields) so access follows
 * the specific company assignment: end/expire an assignment and the roles
 * granted through it go with it. A client with no organizationId is
 * realm-agnostic (e.g. an internal admin console) and stays open to any
 * authenticated identity.
 */
import { ObjectId } from 'mongodb';
import { db } from '$lib/db/db';
import type { Identity } from '$lib/db/schemas';

function activeAssignments(identity: Identity, organizationId: string) {
	const now = new Date();
	return (identity.assignments || []).filter((a) =>
		a.organizationId === organizationId &&
		a.employmentStatus !== 'terminated' &&
		a.employmentStatus !== 'resigned' &&
		a.startDate <= now &&
		(!a.endDate || a.endDate >= now)
	);
}

function toObjectIds(ids: string[]): ObjectId[] {
	return ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
}

export async function canIdentityAccessClient(identityId: string, clientId: string): Promise<boolean> {
	const client = await db.oauthClients.findOne({ clientId } as any);
	if (!client) return false;
	if (!client.organizationId) return true; // realm-agnostic client

	const identity = await db.identities.findById(identityId);
	if (!identity) return false;

	const assignments = activeAssignments(identity, client.organizationId);
	const realmRoleIds = assignments.flatMap((a) => a.realmRoleIds || []);
	if (realmRoleIds.length === 0) return false;

	const realmRoles = await db.realmRoles.find({
		_id: { $in: toObjectIds(realmRoleIds) },
		isActive: true
	} as any);

	return realmRoles.some((role) => role.allowedClientIds.includes(clientId));
}

/** Resolves this identity's in-app permission names for a client, for the `roles` token claim. */
export async function getClientRoleNames(identityId: string, clientId: string): Promise<string[]> {
	const client = await db.oauthClients.findOne({ clientId } as any);
	if (!client) return [];

	const identity = await db.identities.findById(identityId);
	if (!identity) return [];

	const assignments = client.organizationId
		? activeAssignments(identity, client.organizationId)
		: (identity.assignments || []);
	const clientRoleIds = assignments.flatMap((a) => a.clientRoleIds || []);
	if (clientRoleIds.length === 0) return [];

	const roles = await db.clientRoles.find({
		_id: { $in: toObjectIds(clientRoleIds) },
		clientId
	} as any);

	return roles.map((r) => r.name);
}
