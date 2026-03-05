/**
 * Authentication Audit Logger
 * Tracks all authentication-related events for security and compliance
 */

import { getDB } from '$lib/db/connection';
import type { ObjectId } from 'mongodb';

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
	_id?: ObjectId;
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

/**
 * Log an authentication event
 */
export async function logAuthEvent(event: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
	const db = getDB();

	const logEntry: AuditLogEntry = {
		...event,
		timestamp: new Date()
	};

	try {
		await db.collection('audit_logs').insertOne(logEntry);
	} catch (error) {
		// Don't throw errors on audit logging failure - just log to console
		console.error('Failed to write audit log:', error);
	}
}

/**
 * Log successful login
 */
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

/**
 * Log failed login attempt
 */
export async function logLoginFailed(
	email: string,
	reason: string,
	options?: {
		ipAddress?: string;
		userAgent?: string;
	}
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

/**
 * Log logout
 */
export async function logLogout(
	identityId: string,
	email: string,
	options?: {
		sessionId?: string;
		reason?: 'user_initiated' | 'timeout' | 'forced';
	}
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

/**
 * Log registration
 */
export async function logRegistration(
	identityId: string,
	email: string,
	options?: {
		ipAddress?: string;
		userAgent?: string;
		organizationId?: string;
	}
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

/**
 * Log password change
 */
export async function logPasswordChange(
	identityId: string,
	email: string,
	method: 'profile' | 'reset' | 'admin',
	options?: {
		ipAddress?: string;
		initiatedBy?: string;
	}
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

/**
 * Log 2FA events
 */
export async function log2FAEvent(
	eventType: '2fa_enabled' | '2fa_disabled' | '2fa_verified' | '2fa_failed',
	identityId: string,
	email: string,
	success: boolean,
	metadata?: Record<string, any>
): Promise<void> {
	await logAuthEvent({
		eventType,
		identityId,
		email,
		success,
		metadata
	});
}

/**
 * Log email change
 */
export async function logEmailChange(
	identityId: string,
	oldEmail: string,
	newEmail: string,
	options?: {
		ipAddress?: string;
	}
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

/**
 * Log suspicious activity
 */
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
		metadata: {
			description,
			...options?.metadata
		},
		ipAddress: options?.ipAddress,
		userAgent: options?.userAgent
	});
}

/**
 * Get recent audit logs for an identity
 */
export async function getIdentityAuditLogs(
	identityId: string,
	limit: number = 50
): Promise<AuditLogEntry[]> {
	const db = getDB();

	const logs = await db
		.collection('audit_logs')
		.find({ identityId })
		.sort({ timestamp: -1 })
		.limit(limit)
		.toArray();

	return logs as AuditLogEntry[];
}

/**
 * Get failed login attempts for an email (for rate limiting/lockout)
 */
export async function getRecentFailedLogins(
	email: string,
	minutesAgo: number = 15
): Promise<number> {
	const db = getDB();

	const count = await db.collection('audit_logs').countDocuments({
		email,
		eventType: 'login_failed',
		timestamp: { $gte: new Date(Date.now() - minutesAgo * 60 * 1000) }
	});

	return count;
}

/**
 * Clean up old audit logs (run periodically - keep last 90 days)
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
	const db = getDB();

	const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

	const result = await db.collection('audit_logs').deleteMany({
		timestamp: { $lt: cutoffDate }
	});

	return result.deletedCount;
}
