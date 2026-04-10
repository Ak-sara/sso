import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const AuthCodeSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	code: z.string(),
	clientId: z.string(),
	identityId: z.string(),
	redirectUri: z.string().url(),
	scope: z.string(),
	codeChallenge: z.string().optional(),
	codeChallengeMethod: z.string().optional(),
	expiresAt: z.date(),
	createdAt: z.date().default(() => new Date()),
});

export type AuthCode = z.infer<typeof AuthCodeSchema>;

// ── Domain helpers ──────────────────────────────────────────────────

import { db } from '../db';

export async function deleteExpiredAuthCodes() {
	await db.authCodes.deleteOne({ expiresAt: { $lt: new Date() } } as any);
}
