import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const OrgUnitSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	organizationId: z.string(), // Which company/entity

	code: z.string(), // DU, DC, DO, etc
	type: z.enum(['board', 'directorate', 'division', 'department', 'section', 'team', 'sbu']),
	name: z.string(), // Direktur Utama, Direktur Komersial, etc
	shortName: z.string().optional(),
	description: z.string().optional(),

	parentId: z.string().optional(), // Reference to parent unit
	groupId: z.string().optional(), // Reference to group unit
	picId: z.string().optional(), // Reference to pic unit
	managerId: z.string().optional(), // Employee ID of manager
	
	diagram: z.enum(['block', 'logical', 'neck', 'group']),

	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type OrgUnit = z.infer<typeof OrgUnitSchema>;

// ── Domain helpers ──────────────────────────────────────────────────

import { db } from '../db';

export async function orgUnitHasChildren(id: string): Promise<boolean> {
	return db.orgUnits.exists({ parentId: new ObjectId(id) } as any);
}

export async function orgUnitHasEmployees(id: string): Promise<boolean> {
	return db.identities.exists({
		identityType: 'employee',
		'employee.orgUnitId': new ObjectId(id)
	} as any);
}

export async function getOrgUnitDescendants(id: string): Promise<string[]> {
	const descendants: string[] = [];
	const queue = [id];
	while (queue.length > 0) {
		const currentId = queue.shift()!;
		if (!ObjectId.isValid(currentId)) continue;
		const children = await db.orgUnits.find({ parentId: new ObjectId(currentId) } as any);
		for (const child of children) {
			const childId = child._id!.toString();
			descendants.push(childId);
			queue.push(childId);
		}
	}
	return descendants;
}
