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
	AuthCode, RefreshToken, OrgStructureVersion,
	SystemSettings, SKPenempatan,
	ScimClient, ScimAccessToken, EntraIDConfig,
} from './schemas';

// Re-export for consumers that import types from here
export { Repository };
export type { PaginatedResult, PaginationInput };

export const lazy = () => getDB();

/**
 * Pre-instantiated typed repository for every collection.
 * Import `db` and use `db.<collection>.<method>()`.
1. identities
2. organizations
3. org_units
4. positions
5. org_structure_versions

6. oauth_clients
7. auth_codes
8. refresh_tokens
9. scim_clients
10. scim_access_tokens

11. system_settings
12. entraid_configs

?. audit_log  -> FBA managed (AuditLogger)
?. sessions   -> FBA managed (MongoSessionManager)
 */
export const db = {
	identities: new Repository<Identity>(lazy, 'identities'),
	organizations: new Repository<Organization>(lazy, 'organizations'),
	orgUnits: new Repository<OrgUnit>(lazy, 'org_units'),
	positions: new Repository<Position>(lazy, 'positions'),
	orgStructureVersions: new Repository<OrgStructureVersion>(lazy, 'org_structure_versions'),
	
	oauthClients: new Repository<OAuthClient>(lazy, 'oauth_clients'),
	authCodes: new Repository<AuthCode>(lazy, 'auth_codes'),
	refreshTokens: new Repository<RefreshToken>(lazy, 'refresh_tokens'),
	scimClients: new Repository<ScimClient>(lazy, 'scim_clients'),
	scimAccessTokens: new Repository<ScimAccessToken>(lazy, 'scim_access_tokens'),

	systemSettings: new Repository<SystemSettings>(lazy, 'system_settings'),
	entraidConfigs: new Repository<EntraIDConfig>(lazy, 'entraid_configs'),
	skPenempatan: new Repository<SKPenempatan>(lazy, 'sk_penempatan'),
};
