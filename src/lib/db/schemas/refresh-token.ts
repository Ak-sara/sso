import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const RefreshTokenSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	token: z.string(),
	clientId: z.string(),
	identityId: z.string(),
	scope: z.string(),
	expiresAt: z.date(),
	createdAt: z.date().default(() => new Date()),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;

// ── Domain helpers ──────────────────────────────────────────────────

import { db } from '../db';

export async function deleteExpiredRefreshTokens() {
	await db.refreshTokens.deleteOne({ expiresAt: { $lt: new Date() } } as any);
}
