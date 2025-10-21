/**
 * Seeder Configuration - Maximum Data Volumes
 *
 * Default strategy: MAXIMUM data for comprehensive testing
 * This gives a full picture of all app features and capabilities
 */

export const MAX_DATA_VOLUMES = {
	// Identity Distribution
	identities: {
		employees: 1400,      // Realistic company size
		partners: 80,         // Vendors, consultants, contractors
		external: 15,         // Temporary access users
		serviceAccounts: 5    // OAuth/SCIM service accounts
	},

	// Organization Structure
	organizations: 7,        // MASTER + 6 companies
	orgUnits: 57,           // Complete IAS hierarchy
	positions: 50,          // All levels (executive → staff)

	// Versioning & SK Management
	orgVersions: 5,         // 2020-2025 historical versions
	skPenempatan: 15,       // SK Penempatan decrees
	skReassignmentsTotal: 500, // Total employees reassigned across all SKs

	// Integration Clients
	oauthClients: 5,        // test-client, ofm, hr-system, mobile, analytics
	scimClients: 3,         // OFM, Google Workspace, Slack

	// Audit & History
	employeeHistoryEventsPerPerson: 5, // Avg events per employee (onboard, mutation, etc.)
	auditLogDays: 90,       // Last 90 days of activity
	scimAuditCalls: 1000    // SCIM API call logs
};

/**
 * Database Name Targets (same cluster, different databases)
 */
export const DB_TARGETS = {
	dev: 'aksara-sso-dev',      // Ongoing development
	uat: 'aksara-sso-uat',      // User Acceptance Testing
	test: 'aksara-sso-test'     // Experimental/testing
};

/**
 * Collections to clone (include in duplication)
 */
export const CLONE_INCLUDED_COLLECTIONS = [
	'identities',
	'organizations',
	'org_units',
	'positions',
	'org_structure_versions',
	'sk_penempatan',
	'oauth_clients',
	'scim_clients',
	'entraid_configs',
	'employee_history',
	'audit_logs',
	'scim_audit_logs'
];

/**
 * Collections to skip (transient/session data)
 */
export const CLONE_EXCLUDED_COLLECTIONS = [
	'sessions',
	'auth_codes',
	'refresh_tokens',
	'scim_access_tokens'
];

/**
 * SK Penempatan Status Distribution (15 total)
 */
export const SK_STATUS_DISTRIBUTION = {
	executed: 5,           // Completed reassignments
	approved: 3,           // Ready to execute
	pending_approval: 3,   // Awaiting director sign-off
	draft: 2,              // HR working on data
	cancelled: 2           // Business decision changed
};

/**
 * Employee Status Distribution (1400 total)
 */
export const EMPLOYEE_STATUS_DISTRIBUTION = {
	active: 1300,          // 92.8% active
	terminated: 100        // 7.2% terminated (for history/offboarding examples)
};

/**
 * Employment Type Distribution
 */
export const EMPLOYMENT_TYPE_DISTRIBUTION = {
	permanent: 0.70,       // 70%
	pkwt: 0.20,           // 20% contract
	outsource: 0.10       // 10% outsource
};

/**
 * Regional Distribution
 */
export const REGIONAL_DISTRIBUTION = {
	'CGK': 0.40,          // Jakarta HQ - 40%
	'DPS': 0.20,          // Bali - 20%
	'KNO': 0.15,          // Medan - 15%
	'UPG': 0.10,          // Makassar - 10%
	'SUB': 0.08,          // Surabaya - 8%
	'BDO': 0.04,          // Bandung - 4%
	'PLM': 0.02,          // Palembang - 2%
	'PDG': 0.01           // Padang - 1%
};

/**
 * Employee History Event Types
 */
export const HISTORY_EVENT_TYPES = [
	'onboarding',         // Every employee has this
	'mutation',           // 40% of employees
	'promotion',          // 20% of employees
	'transfer',           // 30% of employees
	'offboarding',        // Terminated employees only
	'org_restructure'     // Affected by SK Penempatan
];

/**
 * Audit Log Action Types Distribution
 */
export const AUDIT_ACTION_DISTRIBUTION = {
	'user_login': 0.40,           // 40% of logs
	'employee_create': 0.10,      // 10%
	'employee_update': 0.15,      // 15%
	'sk_penempatan_create': 0.05, // 5%
	'sk_penempatan_approve': 0.03,// 3%
	'oauth_token_generated': 0.15,// 15%
	'scim_user_sync': 0.10,       // 10%
	'org_structure_update': 0.02  // 2%
};

/**
 * Calculate total identities
 */
export function getTotalIdentities(): number {
	const { employees, partners, external, serviceAccounts } = MAX_DATA_VOLUMES.identities;
	return employees + partners + external + serviceAccounts;
}

/**
 * Calculate total employee history records
 */
export function getTotalEmployeeHistory(): number {
	const { employees } = MAX_DATA_VOLUMES.identities;
	const { employeeHistoryEventsPerPerson } = MAX_DATA_VOLUMES;
	return employees * employeeHistoryEventsPerPerson; // ~7000 records
}

/**
 * Calculate total audit logs
 */
export function getTotalAuditLogs(): number {
	const totalIdentities = getTotalIdentities();
	const { auditLogDays } = MAX_DATA_VOLUMES;
	// Assume avg 2 activities per active user per day
	const avgActivitiesPerDay = totalIdentities * 0.8 * 2;
	return Math.floor(avgActivitiesPerDay * auditLogDays); // ~216,000 logs (limited to 5000 for performance)
}

/**
 * Get database connection string for target
 */
export function getDBName(target: keyof typeof DB_TARGETS): string {
	return DB_TARGETS[target];
}
