import { z } from 'zod';
import { ObjectId } from 'mongodb';

/**
 * Realm Role — an "app access bundle" scoped to one organization/realm.
 * Assigned to an identity's assignment (assignments[].realmRoleIds), it grants
 * access to whichever OAuth clients are listed in allowedClientIds, so an
 * admin can onboard someone by picking one role instead of granting apps
 * one-by-one.
 */
export const RealmRoleSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	organizationId: z.string(),
	name: z.string(),
	description: z.string().optional(),
	allowedClientIds: z.array(z.string()).default([]), // OAuthClient.clientId values
	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type RealmRole = z.infer<typeof RealmRoleSchema>;
