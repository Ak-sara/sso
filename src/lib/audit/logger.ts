/**
 * Audit logger — single pipe via FBA's Logger/Transport pipeline.
 *
 * One `logAudit()` call fans out to every configured transport:
 *  - DatabaseTransport → 'audit_log' collection, read by /management/audit
 *    and by audit-service.ts's separate AuditLogger instance (query/cleanup only).
 *    Always receives every event — this is the complete local audit trail.
 *  - syslog transport (only if AUDIT_SYSLOG_HOST is set) → forwards a scoped
 *    subset of the same events to a SIEM (Wazuh, etc.) in real time, no
 *    separate write path. Scoped via AUDIT_SYSLOG_TOPICS (rsyslog-style
 *    filtering) so routine/noisy topics don't have to be forwarded.
 */

import { Logger, DatabaseTransport, createSyslogTransport } from '@ak-sara/fbao/foundation';
import { getDB } from '$lib/db/connection';

interface WriteableTransport {
	write(entry: any): void;
	flush?(): Promise<void>;
	close?(): Promise<void>;
}

/** Wraps a transport so it only receives entries matching `predicate` — used to scope what reaches the SIEM without touching what Mongo receives. */
class FilteredTransport implements WriteableTransport {
	constructor(
		private readonly inner: WriteableTransport,
		private readonly predicate: (entry: any) => boolean
	) {}
	write(entry: any): void {
		if (this.predicate(entry)) this.inner.write(entry);
	}
	async flush(): Promise<void> { await this.inner.flush?.(); }
	async close(): Promise<void> { await this.inner.close?.(); }
}

// AUDIT_SYSLOG_TOPICS=auth,identity,oauth — allowlist of topics forwarded to
// the SIEM. Unset = forward every topic. Mongo always gets everything either way.
const syslogTopics = process.env.AUDIT_SYSLOG_TOPICS
	? new Set(process.env.AUDIT_SYSLOG_TOPICS.split(',').map((t) => t.trim()).filter(Boolean))
	: null;

const transports = [
	new DatabaseTransport(() => getDB(), { collectionName: 'audit_log' }),
	...(process.env.AUDIT_SYSLOG_HOST
		? [new FilteredTransport(
			createSyslogTransport({
				host: process.env.AUDIT_SYSLOG_HOST,
				port: process.env.AUDIT_SYSLOG_PORT ? Number(process.env.AUDIT_SYSLOG_PORT) : 514,
				protocol: process.env.AUDIT_SYSLOG_PROTOCOL === 'tcp' ? 'tcp' : 'udp',
				appName: 'aksara-sso'
			}),
			(entry) => !syslogTopics || syslogTopics.has(entry.topic)
		)]
		: [])
];

// 'trace' — audit completeness must never be suppressed by a log-level setting
const auditPipe = new Logger('trace', transports);

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
	auditPipe.info(entry.action, {
		action: entry.action,
		identityId: entry.identityId || 'system',
		resource: entry.resource,
		topic: entry.topic ?? deriveTopic(entry.action),
		resourceId: entry.resourceId,
		details: { ...entry.details, status: entry.status ?? 'success' },
		ipAddress: entry.ipAddress,
		userAgent: entry.userAgent,
		organizationId: entry.organizationId,
		traceId: entry.traceId,
	});
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
