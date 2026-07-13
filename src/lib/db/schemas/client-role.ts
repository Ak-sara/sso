import { z } from 'zod';
import { ObjectId } from 'mongodb';

/**
 * Client (App) Role — fine-grained in-app permission scoped to one OAuth
 * client. Assigned to an identity's assignment (assignments[].clientRoleIds),
 * its name is surfaced to that client as a `roles` claim in the ID token /
 * userinfo response; the client decides what to do with it.
 */
export const ClientRoleSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	clientId: z.string(), // OAuthClient.clientId this role belongs to
	name: z.string(),
	description: z.string().optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type ClientRole = z.infer<typeof ClientRoleSchema>;
