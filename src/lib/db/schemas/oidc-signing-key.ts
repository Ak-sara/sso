import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const OidcSigningKeySchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	kid: z.string(),
	algorithm: z.literal('RS256').default('RS256'),
	publicKeyPem: z.string(),
	privateKeyPem: z.string(),
	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
});

export type OidcSigningKey = z.infer<typeof OidcSigningKeySchema>;
