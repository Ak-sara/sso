/**
 * Database Access Layer — all route files use `db.<collection>.<method>()`.
 *
 * Repository<T> is provided by @ak-sara/fbao. This file only defines
 * the SSO-specific collection instances.
 *
 * Usage:
 *   import { db } from '$lib/db/db';
 *   const orgs = await db.organizations.find();
 *   const result = await db.orgUnits.findPaginated(params, {}, ['name', 'code']);
 */

import { Repository } from '@ak-sara/fbao/foundation';
import type { PaginatedResult, PaginationInput } from '@ak-sara/fbao/foundation';
import { getDB } from './connection';
import type {
	Identity, Organization, OrgUnit, Position, OAuthClient,
	AuthCode, RefreshToken, OrgStructureVersion, AuditLog,
	SystemSettings, EmployeeHistory, SKPenempatan,
	ScimClient, EntraIDConfig, EntraIDSyncLog,
} from './schemas';

// Re-export for consumers that import types from here
export { Repository };
export type { PaginatedResult, PaginationInput };

export const lazy = () => getDB();

/**
 * Pre-instantiated typed repository for every collection.
 * Import `db` and use `db.<collection>.<method>()`.
 */
export const db = {
	identities: new Repository<Identity>(lazy, 'identities'),
	organizations: new Repository<Organization>(lazy, 'organizations'),
	orgUnits: new Repository<OrgUnit>(lazy, 'org_units'),
	positions: new Repository<Position>(lazy, 'positions'),
	oauthClients: new Repository<OAuthClient>(lazy, 'oauth_clients'),
	scimClients: new Repository<ScimClient>(lazy, 'scim_clients'),
	authCodes: new Repository<AuthCode>(lazy, 'auth_codes'),
	refreshTokens: new Repository<RefreshToken>(lazy, 'refresh_tokens'),
	orgStructureVersions: new Repository<OrgStructureVersion>(lazy, 'org_structure_versions'),
	auditLogs: new Repository<AuditLog>(lazy, 'audit_logs'),
	systemSettings: new Repository<SystemSettings>(lazy, 'system_settings'),
	entraidConfigs: new Repository<EntraIDConfig>(lazy, 'entraid_configs'),
	entraidSyncLogs: new Repository<EntraIDSyncLog>(lazy, 'entraid_sync_logs'),
	skPenempatan: new Repository<SKPenempatan>(lazy, 'sk_penempatan'),
	employeeHistory: new Repository<EmployeeHistory>(lazy, 'employee_history'),
};
