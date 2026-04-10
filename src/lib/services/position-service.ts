import { useLogger } from '@ak-sara/fbao/foundation';
import { db } from '$lib/db/db';
import type { Position } from '$lib/db/schemas/position';
import type { MongoFilter, MongoUpdate } from './types';

const log = useLogger({ module: 'service:position' });

export type { ServiceResult } from './types';

export type PositionSerialized = Omit<Position, '_id'> & {
	_id: string;
	organizationId: string | null;
};

// ── Serialization ──────────────────────────────────────────────────────────

export function serializePosition(doc: any): PositionSerialized {
	return {
		...doc,
		_id: doc._id.toString(),
		organizationId: doc.organizationId?.toString() || null,
	};
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function listPositions(filter: Record<string, any> = {}): Promise<PositionSerialized[]> {
	const positions = await db.positions.find(filter, { level: 1, name: 1 });
	return (positions as any[]).map(serializePosition);
}

export async function getPositionByCode(code: string): Promise<ServiceResult<PositionSerialized>> {
	const doc = await db.positions.findOne({ code } as MongoFilter<Position>) as any;
	if (!doc) return { ok: false, error: 'Position not found', status: 404 };
	return { ok: true, data: serializePosition(doc) };
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function createPosition(input: Omit<Position, '_id'>): Promise<ServiceResult<{ code: string }>> {
	if (!input.code || !input.name) return { ok: false, error: 'Code and name are required', status: 400 };

	const existing = await db.positions.findOne({ code: input.code } as MongoFilter<Position>);
	if (existing) return { ok: false, error: 'Position code already exists', status: 400 };

	try {
		await db.positions.insertOne(input as any);
		return { ok: true, data: { code: input.code } };
	} catch (err) {
		log.error('Failed to create position', { error: err });
		return { ok: false, error: 'Failed to create position', status: 500 };
	}
}

export async function deletePosition(code: string): Promise<ServiceResult<null>> {
	const usageCount = await db.identities.count({ positionId: code } as MongoFilter<Position>);
	if (usageCount > 0) return { ok: false, error: `Cannot delete. Position is assigned to ${usageCount} employee(s).`, status: 400 };

	try {
		const deleted = await db.positions.deleteOne({ code } as MongoFilter<Position>);
		if (!deleted) return { ok: false, error: 'Position not found', status: 404 };
		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to delete position', { error: err, code });
		return { ok: false, error: 'Failed to delete position', status: 500 };
	}
}

export async function updatePosition(code: string, updates: Partial<Position>): Promise<ServiceResult<null>> {
	try {
		const updated = await db.positions.updateOne(
			{ code } as MongoFilter<Position>,
			{ ...updates, updatedAt: new Date() } as MongoUpdate<Position>
		);
		if (!updated) return { ok: false, error: 'Position not found', status: 404 };
		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to update position', { error: err, code });
		return { ok: false, error: 'Failed to update position', status: 500 };
	}
}
