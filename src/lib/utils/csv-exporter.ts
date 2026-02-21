/**
 * CSV Exporter Utility
 *
 * Exports MongoDB collections to CSV format with human-readable references.
 * Converts ObjectIds to strings and resolves foreign key relationships to names/codes.
 */

import type { Db, Document } from 'mongodb';
import { ObjectId } from 'mongodb';

export interface ExportOptions {
	/** Convert foreign key IDs to human-readable names/codes */
	resolveReferences?: boolean;
	/** Include CSV headers */
	includeHeaders?: boolean;
	/** Custom column order */
	columnOrder?: string[];
	/** Columns to exclude from export */
	excludeColumns?: string[];
	/** Auto-detect all fields from database (ignores column config) */
	autoDetect?: boolean;
	/** Fields to always exclude in auto-detect mode */
	alwaysExclude?: string[];
}

export interface CollectionConfig {
	/** MongoDB collection name */
	collection: string;
	/** CSV column definitions */
	columns: ColumnDefinition[];
	/** Reference resolvers for foreign keys */
	references?: ReferenceDefinition[];
}

export interface ColumnDefinition {
	/** CSV column name */
	name: string;
	/** MongoDB field path (supports nested: 'address.city') */
	field: string;
	/** Transform function */
	transform?: (value: any, doc: Document) => string;
}

export interface ReferenceDefinition {
	/** Field containing ObjectId reference */
	field: string;
	/** Target collection to lookup */
	targetCollection: string;
	/** Field to display from target (e.g., 'name', 'code') */
	displayField: string;
	/** CSV column name for resolved value */
	csvColumn: string;
}

/**
 * Auto-detect columns from collection data
 */
function autoDetectColumns(
	documents: Document[],
	excludeFields: string[] = []
): ColumnDefinition[] {
	if (documents.length === 0) return [];

	// Default fields to exclude
	const defaultExclude = ['_id', '__v', 'createdAt', 'updatedAt', 'password', 'passwordHash'];
	const allExclude = [...defaultExclude, ...excludeFields];

	// Get all unique field names from first 100 documents
	const fieldSet = new Set<string>();
	const sampleSize = Math.min(100, documents.length);

	for (let i = 0; i < sampleSize; i++) {
		const doc = documents[i];
		Object.keys(doc).forEach((key) => {
			if (!allExclude.includes(key)) {
				fieldSet.add(key);
			}
		});
	}

	// Convert to column definitions
	return Array.from(fieldSet).sort().map((field) => ({
		name: field,
		field: field
	}));
}

/**
 * Export a collection to CSV string
 */
export async function exportCollectionToCSV(
	db: Db,
	config: CollectionConfig,
	options: ExportOptions = {}
): Promise<string> {
	const {
		resolveReferences = true,
		includeHeaders = true,
		autoDetect = false,
		alwaysExclude = []
	} = options;

	// Fetch all documents
	const documents = await db.collection(config.collection).find().toArray();

	if (documents.length === 0) {
		const cols = autoDetect ? [] : config.columns;
		return includeHeaders ? cols.map((c) => c.name).join(',') + '\n' : '';
	}

	// Use auto-detected columns or configured columns
	const columns = autoDetect
		? autoDetectColumns(documents, alwaysExclude)
		: config.columns;

	// Build reference lookup cache
	const referenceCache = new Map<string, Map<string, string>>();
	if (resolveReferences && config.references) {
		for (const ref of config.references) {
			const cache = new Map<string, string>();
			const refDocs = await db
				.collection(ref.targetCollection)
				.find()
				.project({ _id: 1, [ref.displayField]: 1 })
				.toArray();

			for (const doc of refDocs) {
				cache.set(doc._id.toString(), doc[ref.displayField] || '');
			}
			referenceCache.set(ref.field, cache);
		}
	}

	// Generate CSV rows
	const rows: string[] = [];

	// Headers
	if (includeHeaders) {
		rows.push(columns.map((c) => escapeCSVValue(c.name)).join(','));
	}

	// Data rows
	for (const doc of documents) {
		const values: string[] = [];

		for (const col of columns) {
			let value = getNestedValue(doc, col.field);

			// Resolve references FIRST (before other transforms)
			if (resolveReferences && config.references && value instanceof ObjectId) {
				const refDef = config.references.find((r) => r.field === col.field);
				if (refDef) {
					const cache = referenceCache.get(refDef.field);
					const resolvedValue = cache?.get(value.toString());
					if (resolvedValue) {
						value = resolvedValue;
					} else {
						// Reference not found in database - output empty string instead of ObjectId
						console.warn(`  ⚠️  Reference not found for ${col.field}: ${value.toString()} (outputting empty)`);
						value = '';
					}
				}
			}
			// Apply custom transform if provided
			if (col.transform && value !== undefined && value !== null) {
				value = col.transform(value, doc);
			}
			// Convert ObjectId to string
			else if (value instanceof ObjectId) {
				value = value.toString();
			}
			// Handle dates
			else if (value instanceof Date) {
				value = value.toISOString().split('T')[0]; // YYYY-MM-DD
			}
			// Handle arrays
			else if (Array.isArray(value)) {
				value = JSON.stringify(value);
			}
			// Handle objects
			else if (value && typeof value === 'object') {
				value = JSON.stringify(value);
			}

			values.push(escapeCSVValue(value ?? ''));
		}

		rows.push(values.join(','));
	}

	return rows.join('\n') + '\n';
}

/**
 * Export collection to CSV file
 */
export async function exportCollectionToFile(
	db: Db,
	config: CollectionConfig,
	outputPath: string,
	options: ExportOptions = {}
): Promise<void> {
	const csv = await exportCollectionToCSV(db, config, options);
	await Bun.write(outputPath, csv);
	console.log(`✓ Exported ${config.collection} to ${outputPath}`);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
	return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Escape CSV value (handle quotes, commas, newlines)
 */
function escapeCSVValue(value: string): string {
	if (value == null) return '';

	const stringValue = String(value);

	// Check if escaping is needed
	if (
		stringValue.includes(',') ||
		stringValue.includes('"') ||
		stringValue.includes('\n') ||
		stringValue.includes('\r')
	) {
		// Escape quotes by doubling them
		return `"${stringValue.replace(/"/g, '""')}"`;
	}

	return stringValue;
}

/**
 * Collection configurations for all SSO collections
 */
export const COLLECTION_CONFIGS: Record<string, CollectionConfig> = {
	organizations: {
		collection: 'organizations',
		columns: [
			{ name: 'code', field: 'code' },
			{ name: 'name', field: 'name' },
			{ name: 'parentCode', field: 'parentId' },
			{ name: 'realm', field: 'realm' },
			{ name: 'isActive', field: 'isActive' }
		],
		references: [
			{
				field: 'parentId',
				targetCollection: 'organizations',
				displayField: 'code',
				csvColumn: 'parentCode'
			}
		]
	},

	positions: {
		collection: 'positions',
		columns: [
			{ name: 'code', field: 'code' },
			{ name: 'name', field: 'name' },
			{ name: 'level', field: 'level' },
			{ name: 'description', field: 'description' }
		]
	},

	org_units: {
		collection: 'org_units',
		columns: [
			{ name: 'code', field: 'code' },
			{ name: 'name', field: 'name' },
			{ name: 'organization', field: 'organizationId' },
			{ name: 'parentCode', field: 'parentId' },
			{ name: 'unitType', field: 'unitType' },
			{ name: 'description', field: 'description' }
		],
		references: [
			{
				field: 'organizationId',
				targetCollection: 'organizations',
				displayField: 'code',
				csvColumn: 'organization'
			},
			{
				field: 'parentId',
				targetCollection: 'org_units',
				displayField: 'code',
				csvColumn: 'parentCode'
			}
		]
	},

	identities: {
		collection: 'identities',
		columns: [
			{ name: 'identityType', field: 'identityType' },
			{ name: 'email', field: 'email' },
			{ name: 'username', field: 'username' },
			{ name: 'firstName', field: 'firstName' },
			{ name: 'lastName', field: 'lastName' },
			{ name: 'employeeId', field: 'employeeId' },
			{ name: 'organization', field: 'organizationId' },
			{ name: 'orgUnit', field: 'orgUnitId' },
			{ name: 'position', field: 'positionId' },
			{ name: 'manager', field: 'managerId' },
			{ name: 'employmentType', field: 'employmentType' },
			{ name: 'employmentStatus', field: 'employmentStatus' },
			{ name: 'isActive', field: 'isActive' },
			{ name: 'partnerType', field: 'partnerType' },
			{ name: 'companyName', field: 'companyName' }
		],
		references: [
			{
				field: 'organizationId',
				targetCollection: 'organizations',
				displayField: 'code',
				csvColumn: 'organization'
			},
			{
				field: 'orgUnitId',
				targetCollection: 'org_units',
				displayField: 'name',
				csvColumn: 'orgUnit'
			},
			{
				field: 'positionId',
				targetCollection: 'positions',
				displayField: 'name',
				csvColumn: 'position'
			},
			{
				field: 'managerId',
				targetCollection: 'identities',
				displayField: 'email',
				csvColumn: 'manager'
			}
		]
	},

	oauth_clients: {
		collection: 'oauth_clients',
		columns: [
			{ name: 'clientId', field: 'clientId' },
			{ name: 'name', field: 'name' },
			{ name: 'redirectUris', field: 'redirectUris', transform: (arr) => arr?.join('|') || '' },
			{ name: 'scopes', field: 'scopes', transform: (arr) => arr?.join(' ') || '' },
			{ name: 'isActive', field: 'isActive' }
		]
	},

	scim_clients: {
		collection: 'scim_clients',
		columns: [
			{ name: 'clientId', field: 'clientId' },
			{ name: 'name', field: 'name' },
			{ name: 'scopes', field: 'scopes', transform: (arr) => arr?.join(' ') || '' },
			{ name: 'isActive', field: 'isActive' },
			{ name: 'ipWhitelist', field: 'ipWhitelist', transform: (arr) => arr?.join('|') || '' }
		]
	},

	sk_penempatan: {
		collection: 'sk_penempatan',
		columns: [
			{ name: 'skNumber', field: 'skNumber' },
			{ name: 'skDate', field: 'skDate', transform: (d) => d?.toISOString().split('T')[0] },
			{ name: 'effectiveDate', field: 'effectiveDate', transform: (d) => d?.toISOString().split('T')[0] },
			{ name: 'title', field: 'title' },
			{ name: 'organization', field: 'organizationId' },
			{ name: 'status', field: 'status' }
		],
		references: [
			{
				field: 'organizationId',
				targetCollection: 'organizations',
				displayField: 'code',
				csvColumn: 'organization'
			}
		]
	},

	org_structure_versions: {
		collection: 'org_structure_versions',
		columns: [
			{ name: 'version', field: 'version' },
			{ name: 'organization', field: 'organizationId' },
			{ name: 'effectiveDate', field: 'effectiveDate', transform: (d) => d?.toISOString().split('T')[0] },
			{ name: 'status', field: 'status' },
			{ name: 'description', field: 'description' },
			{ name: 'skNumber', field: 'skNumber' },
			{ name: 'skDate', field: 'skDate', transform: (d) => d?.toISOString().split('T')[0] },
			{ name: 'createdBy', field: 'createdBy' },
			{ name: 'snapshot', field: 'snapshot', transform: (obj) => JSON.stringify(obj) }
		],
		references: [
			{
				field: 'organizationId',
				targetCollection: 'organizations',
				displayField: 'code',
				csvColumn: 'organization'
			}
		]
	},

	entraid_configs: {
		collection: 'entraid_configs',
		columns: [
			{ name: 'organization', field: 'organizationId' },
			{ name: 'tenantId', field: 'tenantId' },
			{ name: 'clientId', field: 'clientId' },
			{ name: 'isActive', field: 'isActive' },
			{ name: 'syncDirection', field: 'syncDirection' },
			{ name: 'syncSchedule', field: 'syncSchedule' },
			{ name: 'fieldMappings', field: 'fieldMappings', transform: (obj) => JSON.stringify(obj) }
		],
		references: [
			{
				field: 'organizationId',
				targetCollection: 'organizations',
				displayField: 'code',
				csvColumn: 'organization'
			}
		]
	},

	audit_log: {
		collection: 'audit_log',
		columns: [
			{ name: 'timestamp', field: 'timestamp', transform: (d) => d?.toISOString() },
			{ name: 'userId', field: 'userId' },
			{ name: 'action', field: 'action' },
			{ name: 'resource', field: 'resource' },
			{ name: 'resourceId', field: 'resourceId' },
			{ name: 'details', field: 'details', transform: (obj) => JSON.stringify(obj) },
			{ name: 'ipAddress', field: 'ipAddress' },
			{ name: 'userAgent', field: 'userAgent' }
		]
	}
};
