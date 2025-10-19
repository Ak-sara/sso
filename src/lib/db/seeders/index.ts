import { connectDB, disconnectDB } from '../connection';
import { seedOrganizations } from './organizations';
import { seedOrgUnits } from './org-units';
import { seedEmployees } from './employees';
import { seedPositions } from './positions';
import { seedUsers } from './users';
import { seedOAuthClients } from './oauth-clients';
import { seedPartners } from './partners';
import { seedOrgStructureVersions } from './org-structure-versions';

/**
 * Main seed orchestrator - Production-like complete dataset
 */
export async function seed() {
	const clear = true;
	const employeeCount = 1500;

	console.log('🌱 Starting database seeding...');
	console.log(`   Options: clear=${clear}, employeeCount=${employeeCount}`);

	try {
		const db = await connectDB();

		// Clear collections if requested
		if (clear) {
			console.log('🗑️  Clearing collections...');
			await db.collection('users').deleteMany({});
			await db.collection('oauth_clients').deleteMany({});
			await db.collection('organizations').deleteMany({});
			await db.collection('org_units').deleteMany({});
			await db.collection('positions').deleteMany({});
			await db.collection('employees').deleteMany({});
			await db.collection('partners').deleteMany({});
			await db.collection('org_structure_versions').deleteMany({});
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

		// Seed employees
		await seedEmployees(db, {
			count: employeeCount,
			organizationId: iasId,
			unitMap,
			positionIds,
			clear: false
		});

		// Seed users
		const adminUserId = await seedUsers(db, { clear: false, iasId });

		// Seed OAuth clients
		await seedOAuthClients(db, { clear: false, iasId });

		// Seed partners
		await seedPartners(db, { clear: false, iasId });

		// Seed org structure versions
		await seedOrgStructureVersions(db, { clear: false, iasId, adminUserId: adminUserId || undefined });

		// Create indexes
		console.log('📇 Creating indexes...');

		// Drop old non-unique email index if exists
		try {
			await db.collection('employees').dropIndex('email_1');
			console.log('   Dropped old email_1 index');
		} catch (e) {
			// Index might not exist, that's ok
		}

		await db.collection('users').createIndex({ email: 1 }, { unique: true });
		await db.collection('users').createIndex({ username: 1 }, { unique: true });
		await db.collection('oauth_clients').createIndex({ clientId: 1 }, { unique: true });
		await db.collection('employees').createIndex({ employeeId: 1 }, { unique: true });
		await db.collection('employees').createIndex({ organizationId: 1 });
		await db.collection('employees').createIndex({ email: 1 }, { unique: true }); // ✅ Now unique!
		await db.collection('organizations').createIndex({ code: 1 }, { unique: true });
		await db.collection('org_units').createIndex({ code: 1, organizationId: 1 }, { unique: true });
		await db.collection('partners').createIndex({ partnerId: 1 }, { unique: true });
		console.log('✅ Indexes created');

		console.log('\n✨ Seeding completed successfully!');
		console.log('\n📊 Summary:');
		console.log(`   Organizations: 7 (including MASTER)`);
		console.log(`   Organizational Units: ${Object.keys(unitMap).length}`);
		console.log(`   Positions: 6`);
		console.log(`   Employees: ${employeeCount}`);
		console.log(`   Users: 1`);
		console.log(`   OAuth Clients: 3 (test-client, ofm-client, hr-system)`);
		console.log(`   Partners: 2`);
		console.log(`   Org Structure Versions: 3 (2023, 2024, 2025)`);
		console.log('\n🔑 Login credentials:');
		console.log('   Email: admin@ias.co.id');
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

export { seedOrganizations, seedOrgUnits, seedEmployees };
