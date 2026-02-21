/**
 * Reference Resolver Utility
 *
 * Resolves human-readable names/codes from CSV to MongoDB ObjectIds.
 * Supports fuzzy matching and caching for performance.
 */

import type { Db, ObjectId } from 'mongodb';

/**
 * Check if a string looks like a MongoDB ObjectId (24 hex characters)
 */
function isObjectIdFormat(value: string): boolean {
	return /^[a-f0-9]{24}$/i.test(value.trim());
}

export interface ResolverCache {
	organizations: Map<string, ObjectId>;
	orgUnits: Map<string, ObjectId>;
	positions: Map<string, ObjectId>;
	identities: Map<string, ObjectId>;
}

export interface ResolutionResult {
	success: boolean;
	objectId?: ObjectId;
	error?: string;
}

/**
 * Build cache for all reference collections
 */
export async function buildCache(db: Db): Promise<ResolverCache> {
	console.log('Building reference cache...');

	const cache: ResolverCache = {
		organizations: new Map(),
		orgUnits: new Map(),
		positions: new Map(),
		identities: new Map()
	};

	// Cache organizations by code and name
	const orgs = await db.collection('organizations').find().toArray();
	for (const org of orgs) {
		if (org.code) {
			cache.organizations.set(org.code.toLowerCase(), org._id);
			cache.organizations.set(org.name.toLowerCase(), org._id);
		}
	}

	// Cache org units by code and name
	const units = await db.collection('org_units').find().toArray();
	for (const unit of units) {
		if (unit.code) cache.orgUnits.set(unit.code.toLowerCase(), unit._id);
		cache.orgUnits.set(unit.name.toLowerCase(), unit._id);
	}

	// Cache positions by code and name
	const positions = await db.collection('positions').find().toArray();
	for (const position of positions) {
		if (position.code) cache.positions.set(position.code.toLowerCase(), position._id);
		cache.positions.set(position.name.toLowerCase(), position._id);
	}

	// Cache identities by email, username, employeeId
	const identities = await db.collection('identities').find().toArray();
	for (const identity of identities) {
		if (identity.email) cache.identities.set(identity.email.toLowerCase(), identity._id);
		if (identity.username) cache.identities.set(identity.username.toLowerCase(), identity._id);
		if (identity.employeeId) cache.identities.set(identity.employeeId.toLowerCase(), identity._id);
	}

	console.log(`✓ Cached: ${cache.organizations.size} orgs, ${cache.orgUnits.size} units, ${cache.positions.size} positions, ${cache.identities.size} identities`);

	return cache;
}

/**
 * Resolve organization by code or name
 */
export function resolveOrganization(
	value: string | null | undefined,
	cache: ResolverCache
): ResolutionResult {
	if (!value || value.trim() === '') {
		return { success: true }; // Empty is valid (no reference)
	}

	// Skip ObjectId strings from exports (treat as empty reference)
	if (isObjectIdFormat(value)) {
		console.warn(`  ⚠️  Skipping ObjectId string in CSV: ${value} (treat as empty)`);
		return { success: true }; // Empty is valid
	}

	const normalized = value.trim().toLowerCase();
	const objectId = cache.organizations.get(normalized);

	if (objectId) {
		return { success: true, objectId };
	}

	return {
		success: false,
		error: `Organization not found: "${value}"`
	};
}

/**
 * Resolve org unit by code or name
 */
export function resolveOrgUnit(
	value: string | null | undefined,
	cache: ResolverCache
): ResolutionResult {
	if (!value || value.trim() === '') {
		return { success: true }; // Empty is valid
	}

	// Skip ObjectId strings from exports (treat as empty reference)
	if (isObjectIdFormat(value)) {
		console.warn(`  ⚠️  Skipping ObjectId string in CSV: ${value} (treat as empty)`);
		return { success: true };
	}

	const normalized = value.trim().toLowerCase();
	const objectId = cache.orgUnits.get(normalized);

	if (objectId) {
		return { success: true, objectId };
	}

	return {
		success: false,
		error: `Org unit not found: "${value}"`
	};
}

/**
 * Resolve position by code or name
 */
export function resolvePosition(
	value: string | null | undefined,
	cache: ResolverCache
): ResolutionResult {
	if (!value || value.trim() === '') {
		return { success: true }; // Empty is valid
	}

	// Skip ObjectId strings from exports (treat as empty reference)
	if (isObjectIdFormat(value)) {
		console.warn(`  ⚠️  Skipping ObjectId string in CSV: ${value} (treat as empty)`);
		return { success: true };
	}

	const normalized = value.trim().toLowerCase();
	const objectId = cache.positions.get(normalized);

	if (objectId) {
		return { success: true, objectId };
	}

	return {
		success: false,
		error: `Position not found: "${value}"`
	};
}

/**
 * Resolve identity by email, username, or employeeId
 */
export function resolveIdentity(
	value: string | null | undefined,
	cache: ResolverCache
): ResolutionResult {
	if (!value || value.trim() === '') {
		return { success: true }; // Empty is valid
	}

	// Skip ObjectId strings from exports (treat as empty reference)
	if (isObjectIdFormat(value)) {
		console.warn(`  ⚠️  Skipping ObjectId string in CSV: ${value} (treat as empty)`);
		return { success: true };
	}

	const normalized = value.trim().toLowerCase();
	const objectId = cache.identities.get(normalized);

	if (objectId) {
		return { success: true, objectId };
	}

	return {
		success: false,
		error: `Identity not found: "${value}"`
	};
}

/**
 * Resolve all references in a CSV row for identities collection
 */
export function resolveIdentityReferences(
	row: Record<string, any>,
	cache: ResolverCache
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	const errors: string[] = [];
	const resolved: Record<string, any> = { ...row };

	// Resolve organizationId
	if (row.organization) {
		const result = resolveOrganization(row.organization, cache);
		if (result.success && result.objectId) {
			resolved.organizationId = result.objectId;
			delete resolved.organization;
		} else if (result.success && !result.objectId) {
			delete resolved.organization;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Resolve orgUnitId
	if (row.orgUnit) {
		const result = resolveOrgUnit(row.orgUnit, cache);
		if (result.success && result.objectId) {
			resolved.orgUnitId = result.objectId;
			delete resolved.orgUnit;
		} else if (result.success && !result.objectId) {
			delete resolved.orgUnit;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Resolve positionId
	if (row.position) {
		const result = resolvePosition(row.position, cache);
		if (result.success && result.objectId) {
			resolved.positionId = result.objectId;
			delete resolved.position;
		} else if (result.success && !result.objectId) {
			delete resolved.position;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Resolve managerId
	if (row.manager) {
		const result = resolveIdentity(row.manager, cache);
		if (result.success && result.objectId) {
			resolved.managerId = result.objectId;
			delete resolved.manager;
		} else if (result.success && !result.objectId) {
			delete resolved.manager;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Convert boolean strings
	if (typeof resolved.isActive === 'string') {
		resolved.isActive = resolved.isActive.toLowerCase() === 'true';
	}

	// Parse date fields - convert strings to Date objects
	const dateFields = ['joinDate', 'endDate', 'probationEndDate', 'dateOfBirth',
	                    'contractStartDate', 'contractEndDate'];
	for (const field of dateFields) {
		if (row[field] && typeof row[field] === 'string' && row[field].trim() !== '') {
			const parsed = new Date(row[field]);
			if (!isNaN(parsed.getTime())) {
				resolved[field] = parsed;
			} else {
				errors.push(`Invalid date format for ${field}: ${row[field]}`);
			}
		}
		// Don't set field if empty (let schema handle defaults)
	}

	return errors.length > 0 ? { success: false, errors } : { success: true, resolved };
}

/**
 * Resolve all references in a CSV row for org_units collection
 */
export function resolveOrgUnitReferences(
	row: Record<string, any>,
	cache: ResolverCache
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	const errors: string[] = [];
	const resolved: Record<string, any> = { ...row };

	// Resolve organizationId
	if (row.organization) {
		const result = resolveOrganization(row.organization, cache);
		if (result.success && result.objectId) {
			resolved.organizationId = result.objectId;
			delete resolved.organization;
		} else if (result.success && !result.objectId) {
			delete resolved.organization;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Resolve parentId (self-reference to org_units)
	if (row.parentCode) {
		const result = resolveOrgUnit(row.parentCode, cache);
		if (result.success && result.objectId) {
			resolved.parentId = result.objectId;
			delete resolved.parentCode;
		} else if (result.success && !result.objectId) {
			delete resolved.parentCode;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	return errors.length > 0 ? { success: false, errors } : { success: true, resolved };
}

/**
 * Resolve all references in a CSV row for organizations collection
 */
export function resolveOrganizationReferences(
	row: Record<string, any>,
	cache: ResolverCache
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	const errors: string[] = [];
	const resolved: Record<string, any> = { ...row };

	// Resolve parentId (self-reference to organizations)
	if (row.parentCode) {
		const result = resolveOrganization(row.parentCode, cache);
		if (result.success && result.objectId) {
			resolved.parentId = result.objectId;
			delete resolved.parentCode;
		} else if (result.success && !result.objectId) {
			// ObjectId string was skipped - delete the field entirely
			delete resolved.parentCode;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Convert boolean strings
	if (typeof resolved.isActive === 'string') {
		resolved.isActive = resolved.isActive.toLowerCase() === 'true';
	}

	return errors.length > 0 ? { success: false, errors } : { success: true, resolved };
}

/**
 * Resolve references for SK Penempatan
 */
export function resolveSKPenempatanReferences(
	row: Record<string, any>,
	cache: ResolverCache
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	const errors: string[] = [];
	const resolved: Record<string, any> = { ...row };

	// Resolve organizationId
	if (row.organization) {
		const result = resolveOrganization(row.organization, cache);
		if (result.success && result.objectId) {
			resolved.organizationId = result.objectId;
			delete resolved.organization;
		} else if (result.success && !result.objectId) {
			delete resolved.organization;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Parse dates
	if (row.skDate) {
		resolved.skDate = new Date(row.skDate);
	}
	if (row.effectiveDate) {
		resolved.effectiveDate = new Date(row.effectiveDate);
	}

	return errors.length > 0 ? { success: false, errors } : { success: true, resolved };
}

/**
 * Resolve references for entraid_configs
 */
export function resolveEntraidConfigReferences(
	row: Record<string, any>,
	cache: ResolverCache
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	const errors: string[] = [];
	const resolved: Record<string, any> = { ...row };

	// Resolve organizationId
	if (row.organization) {
		const result = resolveOrganization(row.organization, cache);
		if (result.success && result.objectId) {
			resolved.organizationId = result.objectId;
			delete resolved.organization;
		} else if (result.success && !result.objectId) {
			delete resolved.organization;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Convert boolean strings
	if (typeof resolved.isActive === 'string') {
		resolved.isActive = resolved.isActive.toLowerCase() === 'true';
	}

	// Parse JSON fields
	if (typeof resolved.fieldMappings === 'string') {
		try {
			resolved.fieldMappings = JSON.parse(resolved.fieldMappings);
		} catch (e) {
			// Keep as string if parse fails
		}
	}

	return errors.length > 0 ? { success: false, errors } : { success: true, resolved };
}

/**
 * Resolve references for org_structure_versions
 */
export function resolveOrgStructureVersionReferences(
	row: Record<string, any>,
	cache: ResolverCache
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	const errors: string[] = [];
	const resolved: Record<string, any> = { ...row };

	// Resolve organizationId
	if (row.organization) {
		const result = resolveOrganization(row.organization, cache);
		if (result.success && result.objectId) {
			resolved.organizationId = result.objectId;
			delete resolved.organization;
		} else if (result.success && !result.objectId) {
			delete resolved.organization;
		} else if (!result.success) {
			errors.push(result.error!);
		}
	}

	// Parse dates
	if (row.effectiveDate) {
		resolved.effectiveDate = new Date(row.effectiveDate);
	}
	if (row.skDate) {
		resolved.skDate = new Date(row.skDate);
	}

	// Parse JSON snapshot
	if (typeof resolved.snapshot === 'string') {
		try {
			resolved.snapshot = JSON.parse(resolved.snapshot);
		} catch (e) {
			errors.push('Invalid JSON in snapshot field');
		}
	}

	return errors.length > 0 ? { success: false, errors } : { success: true, resolved };
}

/**
 * Resolve references for audit_log
 */
export function resolveAuditLogReferences(
	row: Record<string, any>,
	cache: ResolverCache
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	const errors: string[] = [];
	const resolved: Record<string, any> = { ...row };

	// Parse timestamp
	if (row.timestamp) {
		resolved.timestamp = new Date(row.timestamp);
	}

	// Parse JSON details
	if (typeof resolved.details === 'string') {
		try {
			resolved.details = JSON.parse(resolved.details);
		} catch (e) {
			// Keep as string if parse fails
		}
	}

	return errors.length > 0 ? { success: false, errors } : { success: true, resolved };
}

/**
 * Resolve OAuth client references and transform array fields
 */
function resolveOAuthClientReferences(
	row: Record<string, any>
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	const resolved: Record<string, any> = { ...row };

	// Transform redirectUris from pipe-separated string to array
	if (resolved.redirectUris && typeof resolved.redirectUris === 'string') {
		resolved.redirectUris = resolved.redirectUris
			.split('|')
			.map((uri: string) => uri.trim())
			.filter((uri: string) => uri.length > 0);
	}

	// Transform scopes/allowedScopes from space or pipe-separated string to array
	const scopesField = resolved.scopes || resolved.allowedScopes;
	if (scopesField && typeof scopesField === 'string') {
		resolved.allowedScopes = scopesField
			.split(/[\s|]+/)
			.map((scope: string) => scope.trim())
			.filter((scope: string) => scope.length > 0);
		delete resolved.scopes; // Remove scopes field, use allowedScopes
	}

	// Transform grantTypes from space or pipe-separated string to array
	if (resolved.grantTypes && typeof resolved.grantTypes === 'string') {
		resolved.grantTypes = resolved.grantTypes
			.split(/[\s|]+/)
			.map((type: string) => type.trim())
			.filter((type: string) => type.length > 0);
	}

	// Set defaults
	if (!resolved.allowedScopes || resolved.allowedScopes.length === 0) {
		resolved.allowedScopes = ['openid', 'profile', 'email'];
	}
	if (!resolved.grantTypes || resolved.grantTypes.length === 0) {
		resolved.grantTypes = ['authorization_code', 'refresh_token'];
	}
	if (resolved.isActive === undefined || resolved.isActive === '') {
		resolved.isActive = true;
	}

	// Convert boolean fields
	if (typeof resolved.isActive === 'string') {
		resolved.isActive = resolved.isActive.toLowerCase() === 'true';
	}

	return { success: true, resolved };
}

/**
 * Generic resolver dispatcher
 */
export function resolveReferences(
	collectionName: string,
	row: Record<string, any>,
	cache: ResolverCache
): { success: boolean; resolved?: Record<string, any>; errors?: string[] } {
	switch (collectionName) {
		case 'identities':
			return resolveIdentityReferences(row, cache);
		case 'org_units':
			return resolveOrgUnitReferences(row, cache);
		case 'organizations':
			return resolveOrganizationReferences(row, cache);
		case 'sk_penempatan':
			return resolveSKPenempatanReferences(row, cache);
		case 'entraid_configs':
			return resolveEntraidConfigReferences(row, cache);
		case 'org_structure_versions':
			return resolveOrgStructureVersionReferences(row, cache);
		case 'audit_log':
			return resolveAuditLogReferences(row, cache);
		case 'positions':
			// No references to resolve
			return { success: true, resolved: row };
		case 'oauth_clients':
			return resolveOAuthClientReferences(row);
		case 'scim_clients':
			// No references to resolve
			return { success: true, resolved: row };
		default:
			return {
				success: false,
				errors: [`Unknown collection: ${collectionName}`]
			};
	}
}
