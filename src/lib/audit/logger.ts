/**
 * Audit logger — one write function, all events go to 'audit_log' collection via FBA.
 */

import { AuditLogger, type AuditEntry } from '@ak-sara/fbao/foundation';
import { getDB } from '$lib/db/connection';

const auditLogger = new AuditLogger(() => getDB(), { collectionName: 'audit_log' });

// fba's AuditEntry doesn't declare topic/traceId, but AuditLogger.log() spreads the object as-is into insertOne
interface StoredAuditEntry extends AuditEntry {
	topic?: string;
	traceId?: string;
}

/**
 * topic: coarse-grained category for filtering (e.g. 'auth', 'identity', 'oauth', 'scim', 'sync', 'org').
 * Stored as a top-level field so callers can filter: { topic: 'auth' }.
 */
export interface AuditLogEntry {
	action: string;
	resource: string;
	topic?: string;
	identityId?: string;
	resourceId?: string;
	details?: Record<string, any>;
	ipAddress?: string;
	userAgent?: string;
	organizationId?: string;
	status?: 'success' | 'failed' | 'denied';
	traceId?: string;
}

function deriveTopic(action: string): string {
	if (/^(login|logout|2fa_|password_reset|email_changed|access_)/.test(action)) return 'auth';
	if (/^(create_identity|update_identity|delete_identity|activate_identity|deactivate_identity|employee_)/.test(action)) return 'identity';
	if (/^oauth_/.test(action)) return 'oauth';
	if (/^scim_/.test(action)) return 'scim';
	if (/^sync_/.test(action)) return 'sync';
	if (/^(create_org|update_org|delete_org|create_position|update_position|delete_position|publish_org|archive_org|create_sk|approve_sk|execute_sk)/.test(action)) return 'org';
	return 'general';
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
	const payload: StoredAuditEntry = {
		identityId: entry.identityId || 'system',
		action: entry.action,
		resource: entry.resource,
		topic: entry.topic ?? deriveTopic(entry.action),
		resourceId: entry.resourceId,
		details: { ...entry.details, status: entry.status ?? 'success' },
		ipAddress: entry.ipAddress,
		userAgent: entry.userAgent,
		organizationId: entry.organizationId,
		traceId: entry.traceId,
	};
	await auditLogger.log(payload);
}

export function extractRequestMetadata(event: any): { ipAddress?: string; userAgent?: string } {
	return {
		ipAddress:
			event.getClientAddress?.() ||
			event.request?.headers?.get('x-forwarded-for') ||
			event.request?.headers?.get('x-real-ip') ||
			undefined,
		userAgent: event.request?.headers?.get('user-agent') || undefined
	};
}
