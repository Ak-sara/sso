// Barrel re-export — all existing `import { X } from '$lib/db/schemas'` keeps working
export { IdentitySchema, type Identity } from './identity';
export { findIdentityByEmail, findIdentityByEmployeeId, findIdentityByEmailOrNIK, findIdentitiesByOrgUnit, updateLastLogin, bulkUpsertIdentities, getIdentityStats } from './identity';

export { OAuthClientSchema, type OAuthClient } from './oauth-client';
export { verifyClientSecret } from './oauth-client';

export { AuthCodeSchema, type AuthCode } from './auth-code';
export { deleteExpiredAuthCodes } from './auth-code';

export { RefreshTokenSchema, type RefreshToken } from './refresh-token';
export { deleteExpiredRefreshTokens } from './refresh-token';

export { OrganizationSchema, type Organization } from './organization';
export { listOrganizationsWithUserCount, orgHasUsers, orgHasOrgUnits } from './organization';

export { OrgUnitSchema, type OrgUnit } from './org-unit';
export { orgUnitHasChildren, orgUnitHasEmployees, getOrgUnitDescendants } from './org-unit';

export { OrgStructureVersionSchema, type OrgStructureVersion } from './org-structure-version';
export { SystemSettingsSchema, type SystemSettings } from './system-settings';

export { PositionSchema, type Position } from './position';
export { positionIsInUse } from './position';

export { SKPenempatanSchema, type SKPenempatan } from './sk-penempatan';
export { ScimClientSchema, type ScimClient, ScimAccessTokenSchema, type ScimAccessToken } from './scim';
export { EntraIDConfigSchema, type EntraIDConfig } from './entraid';
export { AuditLogSchema, type AuditLog } from './audit-log';
export { OidcSigningKeySchema, type OidcSigningKey } from './oidc-signing-key';
export { RealmRoleSchema, type RealmRole } from './realm-role';
export { ClientRoleSchema, type ClientRole } from './client-role';
