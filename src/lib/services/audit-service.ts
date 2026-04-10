import { useLogger } from '@ak-sara/fbao/foundation';
import { ObjectId } from 'mongodb';
import { db, type PaginationInput } from '$lib/db/db';
import type { AuditLog } from '$lib/db/schemas/audit-log';
import type { MongoFilter } from './types';

const log = useLogger({ module: 'service:audit' });

// ── Queries (single) ──────────────────────────────────────────────────────

export async function getAuditLogById(id: string) {
	const doc = await db.auditLogs.findById(id) as any;
	if (!doc) return null;

	let identityInfo = null;
	if (doc.identityId === 'system') {
		identityInfo = { _id: 'system', fullName: 'System', email: null, username: 'system', employeeId: null, identityType: 'system' };
	} else if (doc.identityId) {
		const identity = await db.identities.findById(doc.identityId) as any;
		if (identity) identityInfo = {
			_id: identity._id.toString(),
			fullName: identity.fullName,
			email: identity.email,
			username: identity.username,
			employeeId: identity.employeeId,
			identityType: identity.identityType
		};
	}

	let organizationInfo = null;
	if (doc.organizationId) {
		const org = await db.organizations.findById(doc.organizationId) as any;
		if (org) organizationInfo = { _id: org._id.toString(), name: org.name, code: org.code };
	}

	return {
		auditLog: { ...doc, _id: doc._id.toString(), timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp },
		identityInfo,
		organizationInfo,
	};
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function logEvent(event: Omit<AuditLog, '_id' | 'timestamp'>): Promise<void> {
	try {
		await db.auditLogs.insertOne({ ...event, timestamp: new Date() } as any);
	} catch (err) {
		log.error('Failed to write audit log', { error: err, event });
	}
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function listAuditLogs(params: PaginationInput, filter: Record<string, any> = {}) {
	const result = await db.auditLogs.findPaginated(
		params,
		filter,
		['action', 'resource', 'resourceId']
	);

	// Batch-resolve identity names
	const identityIds = result.items
		.map((l: any) => l.identityId)
		.filter((id: string) => id && id !== 'system' && ObjectId.isValid(id));

	const identities = identityIds.length > 0
		? await db.identities.find({ _id: { $in: identityIds.map((id: string) => new ObjectId(id)) } } as MongoFilter<AuditLog>)
		: [];

	const identityMap = new Map(
		(identities as any[]).map((i) => [
			i._id.toString(),
			{ name: i.fullName || i.username, email: i.email, employeeId: i.employeeId }
		])
	);

	return {
		items: result.items.map((l: any) => ({
			...l,
			_id: l._id.toString(),
			timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp,
			identityInfo: l.identityId === 'system'
				? { name: 'System', email: null, employeeId: null }
				: identityMap.get(l.identityId) || null,
		})),
		page: result.page,
		pageSize: result.pageSize,
		total: result.total,
		totalPages: result.totalPages,
	};
}
