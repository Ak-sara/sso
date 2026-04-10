/**
 * Authentication Audit Logger
 * Tracks all authentication-related events for security and compliance.
 * Delegates storage to FBA's AuditLogger.
 */

import { AuditLogger } from '@ak-sara/fbao/foundation';
import { getDB } from '$lib/db/connection';

const auditLogger = new AuditLogger(() => getDB());

export type AuthEventType =
	| 'login_success'
	| 'login_failed'
	| 'login_otp_sent'
	| 'login_otp_verified'
	| 'logout'
	| 'registration'
	| 'email_verification'
	| 'email_change'
	| 'password_change'
	| 'password_reset_requested'
	| 'password_reset'
	| '2fa_enabled'
	| '2fa_disabled'
	| '2fa_verified'
	| '2fa_failed'
	| 'session_created'
	| 'session_invalidated'
	| 'account_locked'
	| 'account_unlocked'
	| 'suspicious_activity';

export interface AuditLogEntry {
	eventType: AuthEventType;
	identityId?: string;
	email?: string;
	username?: string;
	success: boolean;
	metadata?: Record<string, any>;
	ipAddress?: string;
	userAgent?: string;
	timestamp: Date;
	sessionId?: string;
}

export async function logAuthEvent(event: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
	await auditLogger.log({
		action: event.eventType,
		resource: 'sessions',
		identityId: event.identityId,
		details: {
			email: event.email,
			username: event.username,
			success: event.success,
			sessionId: event.sessionId,
			...event.metadata
		},
		ipAddress: event.ipAddress,
		userAgent: event.userAgent,
		status: event.success ? 'success' : 'failed'
	});
}

export async function logLoginSuccess(
	identityId: string,
	email: string,
	options?: {
		ipAddress?: string;
		userAgent?: string;
		sessionId?: string;
		method?: '2fa' | 'otp' | 'password';
	}
): Promise<void> {
	await logAuthEvent({
		eventType: 'login_success',
		identityId,
		email,
		success: true,
		metadata: { method: options?.method || 'password' },
		ipAddress: options?.ipAddress,
		userAgent: options?.userAgent,
		sessionId: options?.sessionId
	});
}

export async function logLoginFailed(
	email: string,
	reason: string,
	options?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
	await logAuthEvent({
		eventType: 'login_failed',
		email,
		success: false,
		metadata: { reason },
		ipAddress: options?.ipAddress,
		userAgent: options?.userAgent
	});
}

export async function logLogout(
	identityId: string,
	email: string,
	options?: { sessionId?: string; reason?: 'user_initiated' | 'timeout' | 'forced' }
): Promise<void> {
	await logAuthEvent({
		eventType: 'logout',
		identityId,
		email,
		success: true,
		metadata: { reason: options?.reason || 'user_initiated' },
		sessionId: options?.sessionId
	});
}

export async function logRegistration(
	identityId: string,
	email: string,
	options?: { ipAddress?: string; userAgent?: string; organizationId?: string }
): Promise<void> {
	await logAuthEvent({
		eventType: 'registration',
		identityId,
		email,
		success: true,
		metadata: { organizationId: options?.organizationId },
		ipAddress: options?.ipAddress,
		userAgent: options?.userAgent
	});
}

export async function logPasswordChange(
	identityId: string,
	email: string,
	method: 'profile' | 'reset' | 'admin',
	options?: { ipAddress?: string; initiatedBy?: string }
): Promise<void> {
	await logAuthEvent({
		eventType: 'password_change',
		identityId,
		email,
		success: true,
		metadata: { method, initiatedBy: options?.initiatedBy },
		ipAddress: options?.ipAddress
	});
}

export async function log2FAEvent(
	eventType: '2fa_enabled' | '2fa_disabled' | '2fa_verified' | '2fa_failed',
	identityId: string,
	email: string,
	success: boolean,
	metadata?: Record<string, any>
): Promise<void> {
	await logAuthEvent({ eventType, identityId, email, success, metadata });
}

export async function logEmailChange(
	identityId: string,
	oldEmail: string,
	newEmail: string,
	options?: { ipAddress?: string }
): Promise<void> {
	await logAuthEvent({
		eventType: 'email_change',
		identityId,
		email: newEmail,
		success: true,
		metadata: { oldEmail, newEmail },
		ipAddress: options?.ipAddress
	});
}

export async function logSuspiciousActivity(
	description: string,
	options?: {
		identityId?: string;
		email?: string;
		ipAddress?: string;
		userAgent?: string;
		metadata?: Record<string, any>;
	}
): Promise<void> {
	await logAuthEvent({
		eventType: 'suspicious_activity',
		identityId: options?.identityId,
		email: options?.email,
		success: false,
		metadata: { description, ...options?.metadata },
		ipAddress: options?.ipAddress,
		userAgent: options?.userAgent
	});
}

export async function getIdentityAuditLogs(identityId: string, limit: number = 50): Promise<AuditLogEntry[]> {
	const results = await auditLogger.query({ identityId }, { limit, sort: { timestamp: -1 } });
	return results.map((r) => ({
		eventType: r.action as AuthEventType,
		identityId: r.identityId,
		email: r.details?.email,
		username: r.details?.username,
		success: r.status === 'success',
		metadata: r.details,
		ipAddress: r.ipAddress,
		userAgent: r.userAgent,
		timestamp: r.timestamp ?? new Date(),
		sessionId: r.details?.sessionId
	}));
}

export async function getRecentFailedLogins(email: string, minutesAgo: number = 15): Promise<number> {
	const results = await auditLogger.query({
		action: 'login_failed',
		'details.email': email,
		timestamp: { $gte: new Date(Date.now() - minutesAgo * 60 * 1000) }
	} as any);
	return results.length;
}

export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
	return auditLogger.cleanup(daysToKeep);
}
