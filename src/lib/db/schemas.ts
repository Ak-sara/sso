import { z } from 'zod';
import type { ObjectId } from 'mongodb';

// ============== User Schema ==============
export const UserSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	email: z.string().email(),
	username: z.string().min(3),
	password: z.string(), // hashed with argon2
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	phone: z.string().optional(),
	avatar: z.string().url().optional(),
	isActive: z.boolean().default(true),
	emailVerified: z.boolean().default(false),
	roles: z.array(z.string()).default(['user']), // user, admin, hr, manager, etc
	organizationId: z.string().optional(),
	employeeId: z.string().optional(), // Reference to Employee collection
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	lastLogin: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

// ============== OAuth Client Schema ==============
export const OAuthClientSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	clientId: z.string(),
	clientSecret: z.string(),
	clientName: z.string(),
	redirectUris: z.array(z.string().url()),
	allowedScopes: z.array(z.string()).default(['openid', 'profile', 'email']),
	grantTypes: z.array(z.string()).default(['authorization_code', 'refresh_token']),
	isActive: z.boolean().default(true),
	organizationId: z.string().optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type OAuthClient = z.infer<typeof OAuthClientSchema>;

// ============== Authorization Code Schema ==============
export const AuthCodeSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	code: z.string(),
	clientId: z.string(),
	userId: z.string(),
	redirectUri: z.string().url(),
	scope: z.string(),
	codeChallenge: z.string().optional(),
	codeChallengeMethod: z.string().optional(),
	expiresAt: z.date(),
	createdAt: z.date().default(() => new Date()),
});

export type AuthCode = z.infer<typeof AuthCodeSchema>;

// ============== Refresh Token Schema ==============
export const RefreshTokenSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	token: z.string(),
	clientId: z.string(),
	userId: z.string(),
	scope: z.string(),
	expiresAt: z.date(),
	createdAt: z.date().default(() => new Date()),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;

// ============== Organization/Company Schema ==============
export const OrganizationSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	code: z.string(), // IAS, IASS, IASG, etc
	name: z.string(),
	legalName: z.string().optional(),
	type: z.enum(['parent', 'subsidiary', 'branch', 'system']).default('subsidiary'),
	parentId: z.string().optional(), // Reference to parent organization
	description: z.string().optional(),
	logo: z.string().url().optional(),
	address: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email().optional(),
	website: z.string().url().optional(),
	taxId: z.string().optional(),
	isActive: z.boolean().default(true),
	settings: z.record(z.any()).optional(),

	// Branding configuration (for white-labeling)
	branding: z.object({
		appName: z.string().optional(), // "IAS SSO", "Customer Portal", etc
		logoBase64: z.string().optional(), // Base64 encoded image: "data:image/png;base64,..."
		faviconBase64: z.string().optional(), // Base64 encoded favicon
		primaryColor: z.string().optional(), // Hex color: "#339999"
		secondaryColor: z.string().optional(), // Hex color: "#ee6a57"
		accentColor: z.string().optional(), // Hex color: "#fbaf43"
		backgroundColor: z.string().optional(), // Background color for login page
		textColor: z.string().optional(), // Text color on colored backgrounds
		loginBackgroundBase64: z.string().optional(), // Login page background image
		emailFromName: z.string().optional(), // Email sender name
		emailFromAddress: z.string().email().optional(), // Email sender address
		supportEmail: z.string().email().optional(),
		supportUrl: z.string().url().optional(),
	}).optional(),

	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// ============== Organization Unit Schema ==============
export const OrgUnitSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	code: z.string(), // DU, DC, DO, etc
	name: z.string(), // Direktur Utama, Direktur Komersial, etc
	shortName: z.string().optional(),
	type: z.enum(['board', 'directorate', 'division', 'department', 'section', 'team', 'sbu']),
	organizationId: z.string(), // Which company/entity
	parentId: z.string().optional(), // Reference to parent unit
	level: z.number().default(0), // Hierarchy level
	managerId: z.string().optional(), // Employee ID of manager
	description: z.string().optional(),
	isActive: z.boolean().default(true),
	sortOrder: z.number().default(0),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type OrgUnit = z.infer<typeof OrgUnitSchema>;

// ============== Organization Structure Version Schema ==============
export const OrgStructureVersionSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	versionNumber: z.number(), // 1, 2, 3, etc.
	versionName: z.string(), // "2025-Q1 Restructure", "Initial Structure", etc.
	organizationId: z.string(), // Which organization this version belongs to
	effectiveDate: z.date(), // When this structure becomes active
	endDate: z.date().optional(), // When this structure is superseded (null = current)
	status: z.enum(['draft', 'pending_approval', 'active', 'archived']).default('draft'),

	// Snapshot of the structure at this version
	structure: z.object({
		orgUnits: z.array(z.object({
			_id: z.string(),
			code: z.string(),
			name: z.string(),
			parentId: z.string().optional(),
			type: z.string(),
			level: z.number(),
			sortOrder: z.number(),
			headEmployeeId: z.string().optional(), // Unit head
		})),
		positions: z.array(z.object({
			_id: z.string(),
			code: z.string(),
			name: z.string(),
			level: z.string(),
			grade: z.string(),
			reportingToPositionId: z.string().optional(),
		})),
	}),

	// Changes from previous version
	changes: z.array(z.object({
		type: z.enum(['unit_added', 'unit_removed', 'unit_renamed', 'unit_moved', 'unit_merged', 'position_added', 'position_removed', 'position_changed']),
		entityType: z.enum(['org_unit', 'position']),
		entityId: z.string(),
		entityName: z.string(),
		oldValue: z.any().optional(),
		newValue: z.any().optional(),
		description: z.string(),
	})).default([]),

	// SK (Surat Keputusan) Information
	skNumber: z.string().optional(), // SK-001/IAS/2025
	skDate: z.date().optional(),
	skSignedBy: z.string().optional(), // Employee ID of signatory (usually Direktur Utama)
	skAttachments: z.array(z.object({
		filename: z.string(),
		fileUrl: z.string(),
		fileType: z.string(), // pdf, docx
		uploadedAt: z.date(),
	})).default([]),

	// Employee Reassignments (for this version)
	reassignments: z.array(z.object({
		employeeId: z.string(),
		employeeName: z.string(),
		oldOrgUnitId: z.string().optional(),
		oldOrgUnitName: z.string().optional(),
		oldPositionId: z.string().optional(),
		oldPositionName: z.string().optional(),
		newOrgUnitId: z.string().optional(),
		newOrgUnitName: z.string().optional(),
		newPositionId: z.string().optional(),
		newPositionName: z.string().optional(),
		effectiveDate: z.date(),
		reason: z.string().optional(),
	})).default([]),

	// Mermaid diagram (auto-generated)
	mermaidDiagram: z.string().optional(),

	// Metadata
	createdBy: z.string(),
	approvedBy: z.string().optional(),
	approvedAt: z.date().optional(),
	notes: z.string().optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type OrgStructureVersion = z.infer<typeof OrgStructureVersionSchema>;

// ============== Position/Job Title Schema ==============
export const PositionSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	code: z.string(),
	name: z.string(),
	level: z.enum(['executive', 'senior', 'middle', 'junior', 'staff']),
	grade: z.string().optional(), // Job grade
	organizationId: z.string(),
	orgUnitId: z.string().optional(),
	description: z.string().optional(),
	responsibilities: z.array(z.string()).default([]),
	requirements: z.array(z.string()).default([]),
	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type Position = z.infer<typeof PositionSchema>;

// ============== Employee Schema ==============
export const EmployeeSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	employeeId: z.string(), // NIK/Employee Number
	userId: z.string().optional(), // Reference to User (if they have SSO access)
	organizationId: z.string(),
	orgUnitId: z.string().optional(),
	positionId: z.string().optional(),
	managerId: z.string().optional(), // Direct manager employee ID

	// Personal Info
	firstName: z.string(),
	lastName: z.string(),
	fullName: z.string(),
	email: z.string().email().optional(), // Optional since not all employees have company email
	phone: z.string().optional(),
	personalEmail: z.string().email().optional(),
	dateOfBirth: z.date().optional(),
	gender: z.enum(['male', 'female', 'other']).optional(),
	idNumber: z.string().optional(), // KTP/ID Card
	taxId: z.string().optional(), // NPWP

	// Employment Info
	employmentType: z.string().default('permanent'), // PKWT, Permanent, OS (Outsource), Contract, etc
	employmentStatus: z.enum(['active', 'inactive', 'terminated', 'resigned', 'retired']).default('active'),
	joinDate: z.date(),
	endDate: z.date().optional(),
	probationEndDate: z.date().optional(),

	// Assignment & Location
	workLocation: z.string().optional(), // CGK, DPS, KNO, etc
	region: z.string().optional(), // Regional 1, Regional 2, etc
	isRemote: z.boolean().default(false),

	// Additional assignments (for multi-company)
	secondaryAssignments: z.array(z.object({
		organizationId: z.string(),
		orgUnitId: z.string().optional(),
		positionId: z.string().optional(),
		startDate: z.date(),
		endDate: z.date().optional(),
		percentage: z.number().optional(), // % of time allocation
	})).default([]),

	// Custom Properties (extensible)
	customProperties: z.record(z.any()).default({}),

	// Metadata
	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string().optional(),
	updatedBy: z.string().optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;

// ============== Partner (Non-Employee) Schema ==============
export const PartnerSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	partnerId: z.string(),
	userId: z.string().optional(), // Reference to User (if they have SSO access)
	organizationId: z.string(),

	// Partner Info
	type: z.enum(['vendor', 'contractor', 'consultant', 'client', 'supplier', 'other']),
	companyName: z.string().optional(),
	contactName: z.string(),
	email: z.string().email(),
	phone: z.string().optional(),

	// Access Info
	accessLevel: z.enum(['read', 'write', 'admin']).default('read'),
	allowedModules: z.array(z.string()).default([]),

	// Contract
	contractNumber: z.string().optional(),
	contractStartDate: z.date().optional(),
	contractEndDate: z.date().optional(),

	// Custom Properties
	customProperties: z.record(z.any()).default({}),

	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type Partner = z.infer<typeof PartnerSchema>;

// ============== Entra ID Configuration Schema ==============
export const EntraIDConfigSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	organizationId: z.string(), // Which organization this config belongs to

	// Microsoft Entra ID credentials
	tenantId: z.string(), // Azure AD Tenant ID
	clientId: z.string(), // Application (client) ID
	clientSecret: z.string(), // Client secret (encrypted in production)

	// Connection status
	isConnected: z.boolean().default(false),
	lastTestedAt: z.date().optional(),
	lastTestStatus: z.enum(['success', 'failed']).optional(),
	lastTestError: z.string().optional(),

	// Sync configuration
	syncUsers: z.boolean().default(true),
	syncGroups: z.boolean().default(false),
	autoSync: z.boolean().default(false),
	syncIntervalMinutes: z.number().default(60), // Default: hourly

	// Field mapping: { aksaraField: entraIdField }
	fieldMapping: z.record(z.object({
		entraField: z.string(),
		enabled: z.boolean().default(true),
		direction: z.enum(['to_entra', 'from_entra', 'bidirectional']).default('to_entra'),
	})).default({
		email: { entraField: 'userPrincipalName', enabled: true, direction: 'to_entra' },
		firstName: { entraField: 'givenName', enabled: true, direction: 'to_entra' },
		lastName: { entraField: 'surname', enabled: true, direction: 'to_entra' },
		phone: { entraField: 'mobilePhone', enabled: false, direction: 'to_entra' },
		jobTitle: { entraField: 'jobTitle', enabled: false, direction: 'to_entra' },
		department: { entraField: 'department', enabled: false, direction: 'to_entra' },
	}),

	// Timestamps
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string(),
	updatedBy: z.string().optional(),
});

export type EntraIDConfig = z.infer<typeof EntraIDConfigSchema>;

// ============== Entra ID Sync Log Schema ==============
export const EntraIDSyncLogSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	syncId: z.string(),
	organizationId: z.string(),
	type: z.enum(['user', 'group', 'full']),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	startedAt: z.date(),
	completedAt: z.date().optional(),
	totalRecords: z.number().default(0),
	successCount: z.number().default(0),
	failureCount: z.number().default(0),
	errors: z.array(z.object({
		recordId: z.string(),
		error: z.string(),
	})).default([]),
	triggeredBy: z.string(),
	createdAt: z.date().default(() => new Date()),
});

export type EntraIDSyncLog = z.infer<typeof EntraIDSyncLogSchema>;

// ============== Audit Log Schema ==============
export const AuditLogSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	userId: z.string(),
	action: z.string(), // login, logout, create_user, update_employee, etc
	resource: z.string(), // users, employees, organizations, etc
	resourceId: z.string().optional(),
	details: z.record(z.any()).optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	organizationId: z.string().optional(),
	timestamp: z.date().default(() => new Date()),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// ============== SK Penempatan Karyawan (Employee Assignment Decree) ==============
export const SKPenempatanSchema = z.object({
	_id: z.custom<ObjectId>().optional(),

	// SK Information
	skNumber: z.string(), // e.g., "SK/IAS/HR/001/2025"
	skDate: z.date(),
	skTitle: z.string().optional(), // e.g., "Penempatan Karyawan Periode Januari 2025"
	effectiveDate: z.date(),

	// Signatory
	signedBy: z.string(), // Employee ID or name of the signatory
	signedByPosition: z.string().optional(), // Position of signatory
	signedAt: z.date().optional(),

	// Organization context
	organizationId: z.string(),

	// Status workflow
	status: z.enum(['draft', 'pending_approval', 'approved', 'executed', 'cancelled']).default('draft'),

	// Reassignments
	reassignments: z.array(z.object({
		employeeId: z.string(), // NIK
		employeeName: z.string(),

		// Previous assignment
		previousOrgUnitId: z.string().optional(),
		previousOrgUnitName: z.string().optional(),
		previousPositionId: z.string().optional(),
		previousPositionName: z.string().optional(),
		previousWorkLocation: z.string().optional(),

		// New assignment
		newOrgUnitId: z.string(),
		newOrgUnitName: z.string(),
		newPositionId: z.string().optional(),
		newPositionName: z.string().optional(),
		newWorkLocation: z.string().optional(),
		newRegion: z.string().optional(),

		// Reason and notes
		reason: z.string().optional(), // e.g., "Promosi", "Rotasi", "Mutasi"
		notes: z.string().optional(),

		// Execution status for each employee
		executed: z.boolean().default(false),
		executedAt: z.date().optional(),
		executionError: z.string().optional()
	})),

	// File attachments
	attachments: z.array(z.object({
		filename: z.string(),
		fileUrl: z.string(),
		fileType: z.string(), // 'pdf', 'csv', 'excel', etc.
		uploadedAt: z.date(),
		uploadedBy: z.string()
	})).default([]),

	// Import metadata (if created from CSV)
	importedFromCSV: z.boolean().default(false),
	csvFilename: z.string().optional(),
	csvImportedAt: z.date().optional(),

	// Statistics
	totalReassignments: z.number(),
	successfulReassignments: z.number().default(0),
	failedReassignments: z.number().default(0),

	// Notes and description
	description: z.string().optional(),
	notes: z.string().optional(),

	// Approval workflow
	requestedBy: z.string(), // User who created this SK
	requestedAt: z.date(),
	approvedBy: z.string().optional(),
	approvedAt: z.date().optional(),
	rejectedBy: z.string().optional(),
	rejectedAt: z.date().optional(),
	rejectionReason: z.string().optional(),

	// Metadata
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string(),
	updatedBy: z.string().optional()
});

export type SKPenempatan = z.infer<typeof SKPenempatanSchema>;

// ============================================
// SCIM CLIENT CREDENTIALS
// ============================================

export const ScimClientSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),

	clientId: z.string(), // "scim-ofm-prod"
	clientName: z.string(), // "OFM Production"
	clientSecret: z.string(), // Hashed secret (Argon2)

	// Organization
	organizationId: z.instanceof(ObjectId).optional(), // Which company owns this client

	// Scopes and permissions
	scopes: z.array(z.enum([
		'read:users',
		'write:users',
		'delete:users',
		'read:groups',
		'write:groups',
		'delete:groups',
		'bulk:operations'
	])).default(['read:users', 'read:groups']),

	// Token settings
	accessTokenExpiresIn: z.number().default(3600), // Seconds (1 hour)

	// Security
	ipWhitelist: z.array(z.string()).optional(), // ["192.168.1.0/24", "10.0.0.1"]
	rateLimit: z.number().default(100), // Requests per minute

	// Status
	isActive: z.boolean().default(true),

	// Metadata
	description: z.string().optional(),
	contactEmail: z.string().email().optional(),

	// Usage stats
	lastUsedAt: z.date().optional(),
	totalRequests: z.number().default(0),

	// Timestamps
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string()
});

export type ScimClient = z.infer<typeof ScimClientSchema>;

export const ScimAccessTokenSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),

	token: z.string(), // JWT token
	clientId: z.string(), // Reference to ScimClient.clientId
	scopes: z.array(z.string()),
	expiresAt: z.date(),
	isRevoked: z.boolean().default(false),

	createdAt: z.date().default(() => new Date())
});

export type ScimAccessToken = z.infer<typeof ScimAccessTokenSchema>;

export const ScimAuditLogSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),

	clientId: z.string(),
	endpoint: z.string(), // "/scim/v2/Users"
	method: z.string(), // "GET", "POST", etc.
	statusCode: z.number(),
	resourceId: z.string().optional(), // User/Group ID affected
	ipAddress: z.string(),
	userAgent: z.string().optional(),
	duration: z.number(), // milliseconds
	errorMessage: z.string().optional(),

	timestamp: z.date().default(() => new Date())
});

export type ScimAuditLog = z.infer<typeof ScimAuditLogSchema>;
