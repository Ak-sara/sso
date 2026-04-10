import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const PositionSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	code: z.string(),
	name: z.string(),
	level: z.enum(['executive', 'senior', 'middle', 'junior', 'staff']),
	grade: z.string().optional(),
	organizationId: z.string(),
	orgUnitId: z.string().optional(),
	description: z.string().optional(),
	responsibilities: z.array(z.string()).default([]),
	requirements: z.array(z.string()).default([]),
	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type Position = z.infer<typeof PositionSchema>;

// ── Domain helpers ──────────────────────────────────────────────────

import { db } from '../db';

export function positionIsInUse(code: string) {
	return db.identities.count({ 'customProperties.positionCode': code } as any);
}
