import type { Db } from 'mongodb';
import { AUDIT_ACTION_DISTRIBUTION } from './config';

interface SeedAuditLogsOptions {
	clear?: boolean;
	days?: number; // Number of days of logs to generate
}

/**
 * Seed Audit Logs
 * Creates realistic audit trail for the last N days
 */
export async function seedAuditLogs(db: Db, options: SeedAuditLogsOptions): Promise<void> {
	const { clear = false, days = 90 } = options;

	console.log(`📊 Seeding Audit Logs (last ${days} days, ~5000 entries)...`);

	if (clear) {
		await db.collection('audit_logs').deleteMany({});
	}

	// Get all identities for activity simulation
	const identities = await db.collection('identities')
		.find({ isActive: true })
		.limit(200) // Use first 200 active users for logs
		.toArray();

	if (identities.length === 0) {
		console.warn('⚠️  No identities found. Run identity seeder first.');
		return;
	}

	const auditLogs = [];
	const now = new Date();
	const targetCount = 5000;

	// Calculate action counts based on distribution
	const actionCounts: Record<string, number> = {};
	for (const [action, percentage] of Object.entries(AUDIT_ACTION_DISTRIBUTION)) {
		actionCounts[action] = Math.floor(targetCount * percentage);
	}

	// Helper to get random date within range
	function randomDate(daysAgo: number): Date {
		const timestamp = now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000);
		return new Date(timestamp);
	}

	// Helper to get random identity
	function randomIdentity() {
		return identities[Math.floor(Math.random() * identities.length)];
	}

	// Generate logs for each action type
	let totalGenerated = 0;

	// 1. USER_LOGIN (40%)
	for (let i = 0; i < actionCounts['user_login']; i++) {
		const identity = randomIdentity();
		auditLogs.push({
			identityId: identity._id.toString(),
			action: 'user_login',
			resource: 'auth',
			details: {
				username: identity.username,
				loginMethod: Math.random() < 0.8 ? 'password' : 'oauth',
				success: Math.random() < 0.95 // 95% success rate
			},
			ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
			organizationId: identity.organizationId,
			timestamp: randomDate(days)
		});
	}

	// 2. EMPLOYEE_CREATE (10%)
	for (let i = 0; i < actionCounts['employee_create']; i++) {
		const identity = randomIdentity();
		auditLogs.push({
			identityId: identity._id.toString(),
			action: 'employee_create',
			resource: 'identities',
			resourceId: `new-employee-${i}`,
			details: {
				employeeId: `IAS${String(10000 + i).padStart(5, '0')}`,
				fullName: 'New Employee',
				orgUnitId: identity.orgUnitId
			},
			ipAddress: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
			organizationId: identity.organizationId,
			timestamp: randomDate(days)
		});
	}

	// 3. EMPLOYEE_UPDATE (15%)
	for (let i = 0; i < actionCounts['employee_update']; i++) {
		const identity = randomIdentity();
		const targetEmployee = randomIdentity();
		auditLogs.push({
			identityId: identity._id.toString(),
			action: 'employee_update',
			resource: 'identities',
			resourceId: targetEmployee._id.toString(),
			details: {
				employeeId: targetEmployee.employeeId,
				fields: ['orgUnitId', 'positionId', 'workLocation'][Math.floor(Math.random() * 3)],
				reason: 'Data update'
			},
			ipAddress: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
			organizationId: identity.organizationId,
			timestamp: randomDate(days)
		});
	}

	// 4. SK_PENEMPATAN_CREATE (5%)
	for (let i = 0; i < actionCounts['sk_penempatan_create']; i++) {
		const identity = randomIdentity();
		auditLogs.push({
			identityId: identity._id.toString(),
			action: 'sk_penempatan_create',
			resource: 'sk_penempatan',
			resourceId: `sk-${i}`,
			details: {
				skNumber: `SK-${String(i + 1).padStart(3, '0')}/IAS/2024`,
				totalReassignments: Math.floor(Math.random() * 100) + 20
			},
			ipAddress: `10.0.1.${Math.floor(Math.random() * 255)}`,
			userAgent: 'Mozilla/5.0',
			organizationId: identity.organizationId,
			timestamp: randomDate(days)
		});
	}

	// 5. SK_PENEMPATAN_APPROVE (3%)
	for (let i = 0; i < actionCounts['sk_penempatan_approve']; i++) {
		const identity = randomIdentity();
		auditLogs.push({
			identityId: identity._id.toString(),
			action: 'sk_penempatan_approve',
			resource: 'sk_penempatan',
			resourceId: `sk-${i}`,
			details: {
				skNumber: `SK-${String(i + 1).padStart(3, '0')}/IAS/2024`,
				approver: identity.fullName,
				status: 'approved'
			},
			ipAddress: `10.0.1.${Math.floor(Math.random() * 255)}`,
			userAgent: 'Mozilla/5.0',
			organizationId: identity.organizationId,
			timestamp: randomDate(days)
		});
	}

	// 6. OAUTH_TOKEN_GENERATED (15%)
	for (let i = 0; i < actionCounts['oauth_token_generated']; i++) {
		const identity = randomIdentity();
		const clientIds = ['test-client', 'ofm-client', 'hr-system', 'mobile-app'];
		auditLogs.push({
			identityId: identity._id.toString(),
			action: 'oauth_token_generated',
			resource: 'oauth',
			details: {
				clientId: clientIds[Math.floor(Math.random() * clientIds.length)],
				grantType: 'authorization_code',
				scopes: ['openid', 'profile', 'email']
			},
			ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			userAgent: 'OAuth Client/1.0',
			organizationId: identity.organizationId,
			timestamp: randomDate(days)
		});
	}

	// 7. SCIM_USER_SYNC (10%)
	for (let i = 0; i < actionCounts['scim_user_sync']; i++) {
		const identity = randomIdentity();
		const scimClients = ['scim-ofm-prod', 'scim-google-workspace', 'scim-slack-integration'];
		auditLogs.push({
			identityId: 'system',
			action: 'scim_user_sync',
			resource: 'scim',
			resourceId: identity._id.toString(),
			details: {
				clientId: scimClients[Math.floor(Math.random() * scimClients.length)],
				operation: ['create', 'update', 'delete'][Math.floor(Math.random() * 3)],
				userName: identity.username
			},
			ipAddress: `10.0.2.${Math.floor(Math.random() * 255)}`,
			userAgent: 'SCIM Client/2.0',
			organizationId: identity.organizationId,
			timestamp: randomDate(days)
		});
	}

	// 8. ORG_STRUCTURE_UPDATE (2%)
	for (let i = 0; i < actionCounts['org_structure_update']; i++) {
		const identity = randomIdentity();
		auditLogs.push({
			identityId: identity._id.toString(),
			action: 'org_structure_update',
			resource: 'org_structure_versions',
			resourceId: `version-${i}`,
			details: {
				versionNumber: i + 1,
				changeType: ['unit_added', 'unit_renamed', 'unit_moved'][Math.floor(Math.random() * 3)]
			},
			ipAddress: `10.0.1.${Math.floor(Math.random() * 255)}`,
			userAgent: 'Mozilla/5.0',
			organizationId: identity.organizationId,
			timestamp: randomDate(days)
		});
	}

	// Sort by timestamp (oldest first)
	auditLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	// Insert in batches
	const batchSize = 1000;
	for (let i = 0; i < auditLogs.length; i += batchSize) {
		const batch = auditLogs.slice(i, i + batchSize);
		await db.collection('audit_logs').insertMany(batch);
		console.log(`   Inserted ${Math.min(i + batchSize, auditLogs.length)}/${auditLogs.length} audit logs...`);
	}

	console.log(`✅ Created ${auditLogs.length} audit log entries`);
	console.log(`   - Last ${days} days of activity`);
	console.log(`   - Distribution: ${Object.keys(AUDIT_ACTION_DISTRIBUTION).length} action types`);
}
