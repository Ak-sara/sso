import { useLogger, AuditLogger } from '@ak-sara/fbao/foundation';
import { ObjectId } from 'mongodb';
import { getDB } from '$lib/db/connection';
import { db, type PaginationInput } from '$lib/db/db';
import type { MongoFilter } from './types';
import type { Identity } from '$lib/db/schemas/identity';

const log = useLogger({ module: 'service:audit' });
const auditLogger = new AuditLogger(() => getDB(), { collectionName: 'audit_log' });
const col = () => getDB().collection('audit_log');

export async function getAuditLogById(id: string) {
	const doc = await col().findOne({ _id: new ObjectId(id) }) as any;
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

const SEARCH_FIELDS = ['action', 'resource', 'resourceId', 'identityId'];

export async function listAuditLogs(params: PaginationInput, filter: Record<string, any> = {}) {
	const page = params.page || 1;
	const pageSize = params.pageSize || 20;
	const skip = (page - 1) * pageSize;

	const query = { ...filter };
	if (params.search) {
		query.$or = SEARCH_FIELDS.map((f) => ({ [f]: { $regex: params.search, $options: 'i' } }));
	}

	// Default to newest-first; only honor an explicit column sort (sortKey set) otherwise
	const sortField = params.sortKey || 'timestamp';
	const sortDir: 1 | -1 = params.sortKey ? (params.sortDirection === 'desc' ? -1 : 1) : -1;

	const [items, total] = await Promise.all([
		col().find(query).sort({ [sortField]: sortDir }).skip(skip).limit(pageSize).toArray(),
		col().countDocuments(query),
	]);

	const identityIds = items
		.map((l: any) => l.identityId)
		.filter((id: string) => id && id !== 'system' && ObjectId.isValid(id));

	const identities = identityIds.length > 0
		? await db.identities.find({ _id: { $in: identityIds.map((id: string) => new ObjectId(id)) } } as MongoFilter<Identity>)
		: [];

	const identityMap = new Map(
		(identities as any[]).map((i) => [
			i._id.toString(),
			{ name: i.fullName || i.username, email: i.email, employeeId: i.employeeId }
		])
	);

	return {
		items: items.map((l: any) => ({
			...l,
			_id: l._id.toString(),
			timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp,
			identityInfo: l.identityId === 'system'
				? { name: 'System', email: null, employeeId: null }
				: identityMap.get(l.identityId) || null,
		})),
		page, pageSize, total,
		totalPages: Math.ceil(total / pageSize),
	};
}

export async function getIdentityAuditLogs(identityId: string, limit = 50) {
	const results = await auditLogger.query({ identityId }, { limit, sort: { timestamp: -1 } });
	return results.map((r: any) => ({
		...r,
		_id: r._id?.toString(),
		timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
	}));
}

export async function getRecentFailedLogins(email: string, minutesAgo = 15): Promise<number> {
	const results = await auditLogger.query({
		action: 'login_failed',
		'details.email': email,
		timestamp: { $gte: new Date(Date.now() - minutesAgo * 60 * 1000) }
	} as any);
	return results.length;
}

export async function cleanupOldAuditLogs(daysToKeep = 90): Promise<number> {
	return auditLogger.cleanup(daysToKeep);
}
