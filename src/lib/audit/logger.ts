import { getDB } from '$lib/db/connection';
import type { AuditLog } from '$lib/db/schemas';

/**
 * Audit Logger Utility
 * Provides reusable functions for logging system activities
 */

export type AuditAction =
	// Authentication
	| 'login'
	| 'logout'
	| 'login_failed'
	| 'password_reset_request'
	| 'password_reset_complete'
	| 'mfa_setup'
	| 'mfa_verify_success'
	| 'mfa_verify_failed'
	| 'mfa_disabled'
	// Identity Management
	| 'create_identity'
	| 'update_identity'
	| 'delete_identity'
	| 'activate_identity'
	| 'deactivate_identity'
	// Employee Lifecycle
	| 'employee_onboard'
	| 'employee_mutation'
	| 'employee_transfer'
	| 'employee_promotion'
	| 'employee_demotion'
	| 'employee_offboard'
	// Organization
	| 'create_organization'
	| 'update_organization'
	| 'delete_organization'
	| 'create_org_unit'
	| 'update_org_unit'
	| 'delete_org_unit'
	| 'create_position'
	| 'update_position'
	| 'delete_position'
	// Org Structure
	| 'create_org_version'
	| 'update_org_version'
	| 'publish_org_version'
	| 'archive_org_version'
	| 'create_sk_penempatan'
	| 'approve_sk_penempatan'
	| 'execute_sk_penempatan'
	// OAuth
	| 'oauth_authorize'
	| 'oauth_token_grant'
	| 'oauth_token_refresh'
	| 'oauth_token_revoke'
	| 'create_oauth_client'
	| 'update_oauth_client'
	| 'delete_oauth_client'
	| 'rotate_oauth_secret'
	// SCIM
	| 'create_scim_client'
	| 'update_scim_client'
	| 'delete_scim_client'
	| 'scim_token_grant'
	// Access Control
	| 'access_granted'
	| 'access_denied'
	| 'permission_changed'
	// Sync
	| 'sync_started'
	| 'sync_completed'
	| 'sync_failed'
	// Configuration
	| 'config_changed'
	| 'settings_updated';

export type AuditResource =
	| 'identities'
	| 'users'
	| 'employees'
	| 'partners'
	| 'organizations'
	| 'org_units'
	| 'positions'
	| 'org_structure_versions'
	| 'sk_penempatan'
	| 'oauth_clients'
	| 'scim_clients'
	| 'sessions'
	| 'tokens'
	| 'settings'
	| 'sync';

export interface AuditLogOptions {
	identityId?: string; // Who performed the action
	action: AuditAction; // What action was performed
	resource: AuditResource; // What resource was affected
	resourceId?: string; // Specific resource ID (e.g., employee NIK, org ID)
	details?: Record<string, any>; // Additional context
	ipAddress?: string; // Request IP
	userAgent?: string; // Request user agent
	organizationId?: string; // Which organization context
	status?: 'success' | 'failed' | 'denied'; // Action result
	errorMessage?: string; // If failed, why?
}

/**
 * Log an audit event
 * @param options - Audit log options
 */
export async function logAudit(options: AuditLogOptions): Promise<void> {
	try {
		const db = getDB();

		const auditLog: Omit<AuditLog, '_id'> = {
			identityId: options.identityId || 'system',
			action: options.action,
			resource: options.resource,
			resourceId: options.resourceId,
			details: {
				...options.details,
				status: options.status || 'success',
				errorMessage: options.errorMessage
			},
			ipAddress: options.ipAddress,
			userAgent: options.userAgent,
			organizationId: options.organizationId,
			timestamp: new Date()
		};

		await db.collection('audit_logs').insertOne(auditLog as any);
	} catch (error) {
		// Don't throw - audit logging should never break the main operation
		console.error('[AUDIT] Failed to log audit event:', error);
	}
}

/**
 * Log authentication event (login, logout, etc.)
 */
export async function logAuth(
	action: Extract<AuditAction, 'login' | 'logout' | 'login_failed'>,
	identityId: string | undefined,
	details: {
		ipAddress?: string;
		userAgent?: string;
		email?: string;
		username?: string;
		reason?: string;
	}
): Promise<void> {
	await logAudit({
		identityId,
		action,
		resource: 'sessions',
		details,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent,
		status: action === 'login_failed' ? 'failed' : 'success'
	});
}

/**
 * Log identity operation (create, update, delete)
 */
export async function logIdentityOperation(
	action: Extract<
		AuditAction,
		| 'create_identity'
		| 'update_identity'
		| 'delete_identity'
		| 'activate_identity'
		| 'deactivate_identity'
	>,
	identityId: string,
	targetIdentityId: string,
	details: {
		identityType?: string;
		changes?: Record<string, any>;
		ipAddress?: string;
		userAgent?: string;
		organizationId?: string;
	}
): Promise<void> {
	await logAudit({
		identityId,
		action,
		resource: 'identities',
		resourceId: targetIdentityId,
		details,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent,
		organizationId: details.organizationId
	});
}

/**
 * Log employee lifecycle event (onboard, mutation, offboard)
 */
export async function logEmployeeLifecycle(
	action: Extract<
		AuditAction,
		| 'employee_onboard'
		| 'employee_mutation'
		| 'employee_transfer'
		| 'employee_promotion'
		| 'employee_demotion'
		| 'employee_offboard'
	>,
	performedBy: string,
	employeeId: string,
	details: {
		employeeName?: string;
		previousOrgUnit?: string;
		newOrgUnit?: string;
		previousPosition?: string;
		newPosition?: string;
		reason?: string;
		effectiveDate?: Date;
		ipAddress?: string;
		userAgent?: string;
		organizationId?: string;
	}
): Promise<void> {
	await logAudit({
		identityId: performedBy,
		action,
		resource: 'employees',
		resourceId: employeeId,
		details,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent,
		organizationId: details.organizationId
	});
}

/**
 * Log organization operation (create, update, delete org/unit/position)
 */
export async function logOrganizationOperation(
	action: Extract<
		AuditAction,
		| 'create_organization'
		| 'update_organization'
		| 'delete_organization'
		| 'create_org_unit'
		| 'update_org_unit'
		| 'delete_org_unit'
		| 'create_position'
		| 'update_position'
		| 'delete_position'
	>,
	performedBy: string,
	resourceId: string,
	details: {
		resourceName?: string;
		changes?: Record<string, any>;
		ipAddress?: string;
		userAgent?: string;
		organizationId?: string;
	}
): Promise<void> {
	const resourceMap: Record<string, AuditResource> = {
		create_organization: 'organizations',
		update_organization: 'organizations',
		delete_organization: 'organizations',
		create_org_unit: 'org_units',
		update_org_unit: 'org_units',
		delete_org_unit: 'org_units',
		create_position: 'positions',
		update_position: 'positions',
		delete_position: 'positions'
	};

	await logAudit({
		identityId: performedBy,
		action,
		resource: resourceMap[action],
		resourceId,
		details,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent,
		organizationId: details.organizationId
	});
}

/**
 * Log org structure versioning operations
 */
export async function logOrgStructure(
	action: Extract<
		AuditAction,
		| 'create_org_version'
		| 'update_org_version'
		| 'publish_org_version'
		| 'archive_org_version'
		| 'create_sk_penempatan'
		| 'approve_sk_penempatan'
		| 'execute_sk_penempatan'
	>,
	performedBy: string,
	resourceId: string,
	details: {
		versionNumber?: number;
		versionName?: string;
		skNumber?: string;
		affectedEmployees?: number;
		ipAddress?: string;
		userAgent?: string;
		organizationId?: string;
	}
): Promise<void> {
	const resource =
		action.includes('sk_') ? 'sk_penempatan' : 'org_structure_versions';

	await logAudit({
		identityId: performedBy,
		action,
		resource: resource as AuditResource,
		resourceId,
		details,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent,
		organizationId: details.organizationId
	});
}

/**
 * Log OAuth operations
 */
export async function logOAuth(
	action: Extract<
		AuditAction,
		| 'oauth_authorize'
		| 'oauth_token_grant'
		| 'oauth_token_refresh'
		| 'oauth_token_revoke'
		| 'create_oauth_client'
		| 'update_oauth_client'
		| 'delete_oauth_client'
		| 'rotate_oauth_secret'
	>,
	identityId: string | undefined,
	details: {
		clientId?: string;
		clientName?: string;
		scope?: string;
		grantType?: string;
		ipAddress?: string;
		userAgent?: string;
		organizationId?: string;
	}
): Promise<void> {
	await logAudit({
		identityId,
		action,
		resource: action.includes('client') ? 'oauth_clients' : 'tokens',
		resourceId: details.clientId,
		details,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent,
		organizationId: details.organizationId
	});
}

/**
 * Log access control events
 */
export async function logAccessControl(
	action: Extract<AuditAction, 'access_granted' | 'access_denied' | 'permission_changed'>,
	identityId: string | undefined,
	details: {
		resource: string;
		resourceId?: string;
		permission?: string;
		reason?: string;
		ipAddress?: string;
		userAgent?: string;
		organizationId?: string;
	}
): Promise<void> {
	await logAudit({
		identityId,
		action,
		resource: 'settings',
		resourceId: details.resourceId,
		details,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent,
		organizationId: details.organizationId,
		status: action === 'access_denied' ? 'denied' : 'success'
	});
}

/**
 * Log sync operations
 */
export async function logSync(
	action: Extract<AuditAction, 'sync_started' | 'sync_completed' | 'sync_failed'>,
	performedBy: string,
	details: {
		syncType?: string;
		source?: string;
		recordsProcessed?: number;
		successCount?: number;
		failureCount?: number;
		errorMessage?: string;
		ipAddress?: string;
		userAgent?: string;
		organizationId?: string;
	}
): Promise<void> {
	await logAudit({
		identityId: performedBy,
		action,
		resource: 'sync',
		details,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent,
		organizationId: details.organizationId,
		status: action === 'sync_failed' ? 'failed' : 'success',
		errorMessage: details.errorMessage
	});
}

/**
 * Helper to extract request metadata from SvelteKit event
 */
export function extractRequestMetadata(event: any): {
	ipAddress?: string;
	userAgent?: string;
} {
	return {
		ipAddress:
			event.getClientAddress?.() ||
			event.request?.headers?.get('x-forwarded-for') ||
			event.request?.headers?.get('x-real-ip') ||
			event.clientAddress ||
			undefined,
		userAgent: event.request?.headers?.get('user-agent') || undefined
	};
}

/**
 * Helper to get current identity ID from session/locals
 */
export function getCurrentIdentityId(locals: any): string | undefined {
	return locals.user?._id?.toString() || locals.user?.id || locals.identity?._id?.toString();
}
