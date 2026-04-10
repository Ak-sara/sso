import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const OAuthClientSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	clientId: z.string(),
	clientSecret: z.string(),
	clientName: z.string(),
	redirectUris: z.array(z.string().url()),
	allowedScopes: z.array(z.string()).default(['openid', 'profile', 'email']),
	grantTypes: z.array(z.string()).default(['authorization_code', 'refresh_token']),
	isActive: z.boolean().default(true),
	organizationId: z.string().optional(),
	serviceAccountId: z.string().optional(), // Link to service_account identity
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type OAuthClient = z.infer<typeof OAuthClientSchema>;

// ── Domain helpers ──────────────────────────────────────────────────

import { verify } from '@node-rs/argon2';

export function verifyClientSecret(client: OAuthClient, secret: string): Promise<boolean> {
	return verify(client.clientSecret, secret);
}
