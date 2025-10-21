import { connectDB, disconnectDB } from '../connection';
import { seedOrganizations } from './organizations';
import { seedOrgUnits } from './org-units';
import { seedIdentities } from './identities';
import { seedPositions } from './positions';
import { seedOAuthClients } from './oauth-clients';
import { seedOrgStructureVersions } from './org-structure-versions';
import { seedSKPenempatan } from './sk-penempatan';
import { seedScimClients } from './scim-clients';
import { seedEmployeeHistory } from './employee-history';
import { seedAuditLogs } from './audit-logs';

/**
 * Main seed orchestrator - Production-like complete dataset
 * UPDATED: Now uses unified Identity collection instead of separate Users/Employees/Partners
 */
export async function seed() {
	const clear = true;
	const identityCount = 1500; // Number of employee identities to create

	console.log('🌱 Starting database seeding (UNIFIED IDENTITY MODEL)...');
	console.log(`   Options: clear=${clear}, identityCount=${identityCount}`);

	try {
		const db = await connectDB();

		// Clear collections if requested
		if (clear) {
			console.log('🗑️  Clearing collections...');
			await db.collection('identities').deleteMany({}); // NEW: Unified collection
			await db.collection('oauth_clients').deleteMany({});
			await db.collection('organizations').deleteMany({});
			await db.collection('org_units').deleteMany({});
			await db.collection('positions').deleteMany({});
			await db.collection('org_structure_versions').deleteMany({});
			await db.collection('sk_penempatan').deleteMany({});
			await db.collection('scim_clients').deleteMany({});
			await db.collection('employee_history').deleteMany({});
			await db.collection('audit_logs').deleteMany({});

			// Legacy collections (will be removed after migration)
			await db.collection('users').deleteMany({});
			await db.collection('employees').deleteMany({});
			await db.collection('partners').deleteMany({});
		}

		let iasId = '';
		let unitMap: Record<string, any> = {};
		let positionIds: string[] = [];

		// Seed organizations
		const orgResult = await seedOrganizations(db, { clear: false });
		iasId = orgResult.iasId;

		// Seed org units
		unitMap = await seedOrgUnits(db, iasId, { clear: false });

		// Seed positions
		positionIds = await seedPositions(db, { clear: false, iasId });

		// Seed identities (replaces seedUsers, seedEmployees, seedPartners)
		const adminIdentityId = await seedIdentities(db, {
			count: identityCount,
			organizationId: iasId,
			unitMap,
			positionIds,
			clear: true
		});

		// Seed OAuth clients
		await seedOAuthClients(db, { clear: false, iasId });

		// Seed org structure versions
		await seedOrgStructureVersions(db, { clear: false, iasId, adminUserId: adminIdentityId || undefined });

		// Seed SK Penempatan (employee reassignment decrees)
		await seedSKPenempatan(db, { clear: false, iasId, adminUserId: adminIdentityId });

		// Seed SCIM clients
		await seedScimClients(db, { clear: false, iasId });

		// Seed employee history
		await seedEmployeeHistory(db, { clear: false, iasId });

		// Seed audit logs
		await seedAuditLogs(db, { clear: false, days: 90 });

		// Create indexes
		console.log('📇 Creating indexes...');

		// NEW: Identities collection indexes
		await db.collection('identities').createIndex({ email: 1 }, { sparse: true });
		await db.collection('identities').createIndex({ username: 1 }, { unique: true });
		await db.collection('identities').createIndex({ employeeId: 1 }, { sparse: true, unique: true });
		await db.collection('identities').createIndex({ identityType: 1 });
		await db.collection('identities').createIndex({ organizationId: 1 });
		await db.collection('identities').createIndex({ isActive: 1 });
		await db.collection('identities').createIndex({ orgUnitId: 1 }, { sparse: true });
		await db.collection('identities').createIndex({ employmentStatus: 1 }, { sparse: true });

		// Other collections
		await db.collection('oauth_clients').createIndex({ clientId: 1 }, { unique: true });
		await db.collection('organizations').createIndex({ code: 1 }, { unique: true });
		await db.collection('org_units').createIndex({ code: 1, organizationId: 1 }, { unique: true });
		await db.collection('positions').createIndex({ code: 1, organizationId: 1 }, { unique: true });
		console.log('✅ Indexes created');

		// Count identities by type
		const employeeCount = await db.collection('identities').countDocuments({ identityType: 'employee' });
		const partnerCount = await db.collection('identities').countDocuments({ identityType: 'partner' });
		const externalCount = await db.collection('identities').countDocuments({ identityType: 'external' });

		// Count additional collections
		const skPenempatanCount = await db.collection('sk_penempatan').countDocuments({});
		const scimClientsCount = await db.collection('scim_clients').countDocuments({});
		const historyCount = await db.collection('employee_history').countDocuments({});
		const auditLogsCount = await db.collection('audit_logs').countDocuments({});

		console.log('\n✨ Seeding completed successfully!');
		console.log('\n📊 Summary (UNIFIED IDENTITY MODEL):');
		console.log(`   Organizations: 7 (including MASTER)`);
		console.log(`   Organizational Units: ${Object.keys(unitMap).length}`);
		console.log(`   Positions: ${positionIds.length}`);
		console.log(`   Identities (Total): ${employeeCount + partnerCount + externalCount}`);
		console.log(`     - Employees: ${employeeCount} (${await db.collection('identities').countDocuments({ identityType: 'employee', isActive: true })} active)`);
		console.log(`     - Partners: ${partnerCount}`);
		console.log(`     - External: ${externalCount}`);
		console.log(`   OAuth Clients: 3 (test-client, ofm-client, hr-system)`);
		console.log(`   SCIM Clients: ${scimClientsCount} (OFM, Google, Slack)`);
		console.log(`   Org Structure Versions: 3 (2023, 2024, 2025)`);
		console.log(`   SK Penempatan: ${skPenempatanCount} decrees (all workflow states)`);
		console.log(`   Employee History: ${historyCount} events (onboard, mutation, etc.)`);
		console.log(`   Audit Logs: ${auditLogsCount} entries (last 90 days)`);
		console.log('\n🔑 Login credentials:');
		console.log('   Email: admin@ias.co.id');
		console.log('   NIK: IAS00001 (can also login with NIK)');
		console.log('   Password: password123');

	} catch (error) {
		console.error('❌ Seeding failed:', error);
		throw error;
	} finally {
		await disconnectDB();
	}
}

// CLI support
if (import.meta.main) {
	seed().catch((error) => {
		console.error('❌ Fatal error:', error);
		process.exit(1);
	});
}

export { seedOrganizations, seedOrgUnits, seedIdentities };
