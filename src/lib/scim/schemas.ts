/**
 * SCIM 2.0 Schema Definitions
 * Following RFC 7643 and RFC 7644
 */

export const SCIM_SCHEMAS = {
	USER: 'urn:ietf:params:scim:schemas:core:2.0:User',
	GROUP: 'urn:ietf:params:scim:schemas:core:2.0:Group',
	ENTERPRISE_USER: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
	LIST_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:ListResponse',
	ERROR: 'urn:ietf:params:scim:api:messages:2.0:Error',
	PATCH_OP: 'urn:ietf:params:scim:api:messages:2.0:PatchOp',
	BULK_REQUEST: 'urn:ietf:params:scim:api:messages:2.0:BulkRequest',
	BULK_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:BulkResponse'
} as const;

export interface ScimMeta {
	resourceType: string;
	created?: string;
	lastModified?: string;
	location?: string;
	version?: string;
}

export interface ScimName {
	formatted?: string;
	familyName?: string;
	givenName?: string;
	middleName?: string;
	honorificPrefix?: string;
	honorificSuffix?: string;
}

export interface ScimEmail {
	value: string;
	type?: string;
	primary?: boolean;
	display?: string;
}

export interface ScimPhoneNumber {
	value: string;
	type?: string;
	primary?: boolean;
}

export interface ScimAddress {
	formatted?: string;
	streetAddress?: string;
	locality?: string;
	region?: string;
	postalCode?: string;
	country?: string;
	type?: string;
	primary?: boolean;
}

export interface ScimEnterpriseUser {
	employeeNumber?: string;
	costCenter?: string;
	organization?: string;
	division?: string;
	department?: string; // Maps to orgUnit._id
	manager?: {
		value?: string; // Manager's user ID
		$ref?: string; // URL reference to manager
		displayName?: string;
	};
}

export interface ScimPosition {
	id: string;
	name: string;
	isManager: boolean;
	level?: number;
}

export interface ScimUser {
	schemas: string[];
	id: string;
	externalId?: string;
	userName: string;
	name?: ScimName;
	displayName?: string;
	nickName?: string;
	profileUrl?: string;
	title?: string;
	userType?: string;
	preferredLanguage?: string;
	locale?: string;
	timezone?: string;
	active: boolean;
	emails?: ScimEmail[];
	phoneNumbers?: ScimPhoneNumber[];
	addresses?: ScimAddress[];
	meta?: ScimMeta;

	// Enterprise extension
	'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: ScimEnterpriseUser;

	// Custom extensions
	'x-position'?: ScimPosition;
	'x-orgUnit'?: {
		id?: string;
		name?: string;
	};
}

export interface ScimGroupMember {
	value: string; // User or Group ID
	$ref?: string; // URL reference
	type?: 'User' | 'Group';
	display?: string;
}

export interface ScimOrgUnit {
	unitType?: string; // directorate, division, department, etc.
	level?: number;
	parentUnitId?: string;
	managerId?: string; // User ID of unit manager/head
}

export interface ScimGroup {
	schemas: string[];
	id: string;
	externalId?: string;
	displayName: string;
	members?: ScimGroupMember[];
	meta?: ScimMeta;

	// Custom extension for org units
	'x-orgUnit'?: ScimOrgUnit;
}

export interface ScimListResponse<T> {
	schemas: string[];
	totalResults: number;
	startIndex?: number;
	itemsPerPage?: number;
	Resources: T[];
}

export interface ScimError {
	schemas: string[];
	status: number;
	scimType?: string;
	detail?: string;
}

export interface ScimPatchOperation {
	op: 'add' | 'remove' | 'replace';
	path?: string;
	value?: any;
}

export interface ScimPatchRequest {
	schemas: string[];
	Operations: ScimPatchOperation[];
}

/**
 * SCIM Error Types
 */
export const SCIM_ERROR_TYPES = {
	INVALID_FILTER: 'invalidFilter',
	TOO_MANY: 'tooMany',
	UNIQUENESS: 'uniqueness',
	MUTABILITY: 'mutability',
	INVALID_SYNTAX: 'invalidSyntax',
	INVALID_PATH: 'invalidPath',
	NO_TARGET: 'noTarget',
	INVALID_VALUE: 'invalidValue',
	INVALID_VERS: 'invalidVers',
	SENSITIVE: 'sensitive'
} as const;
