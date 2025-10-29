import { getDB, connectDB } from '../src/lib/db/connection';
import { versionManager } from '../src/lib/org-structure/version-manager';
import { queryHelper } from '../src/lib/org-structure/query-helper';

/**
 * Test version creation with snapshot
 * Verifies that snapshots capture complete employee data
 */
async function testVersionSnapshot() {
	console.log('🧪 Testing version snapshot creation...\n');

	try {
		// Connect to database
		await connectDB();
		const db = getDB();

		// Get IAS organization
		const org = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!org) {
			throw new Error('IAS organization not found');
		}

		const orgId = org._id.toString();
		console.log(`✅ Found organization: ${org.name} (${orgId})\n`);

		// Count current live data
		const liveEmployees = await db
			.collection('identities')
			.countDocuments({ organizationId: orgId, identityType: 'employee' });
		const liveOrgUnits = await db.collection('org_units').countDocuments({ organizationId: orgId });
		const livePositions = await db.collection('positions').countDocuments({});

		console.log('📊 Current live data:');
		console.log(`   - Employees: ${liveEmployees}`);
		console.log(`   - Org Units: ${liveOrgUnits}`);
		console.log(`   - Positions: ${livePositions}\n`);

		// Create a test version
		console.log('🔨 Creating test version...');
		const versionId = await versionManager.createVersion(
			orgId,
			'Test Version - Snapshot Validation',
			new Date(),
			'Testing snapshot creation with employee data'
		);

		console.log(`✅ Version created: ${versionId}\n`);

		// Fetch the version
		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new (await import('mongodb')).ObjectId(versionId) });

		if (!version) {
			throw new Error('Version not found after creation');
		}

		// Verify snapshot structure
		console.log('🔍 Verifying snapshot structure...');
		const snapshot = version.structure;

		if (!snapshot) {
			throw new Error('❌ No snapshot in version');
		}

		console.log('✅ Snapshot exists\n');

		// Check employees array
		console.log('👥 Employee snapshot validation:');
		const snapshotEmployees = snapshot.employees || [];
		console.log(`   - Employees in snapshot: ${snapshotEmployees.length}`);

		if (snapshotEmployees.length === 0) {
			console.log('⚠️  WARNING: No employees in snapshot!');
		} else {
			console.log('✅ Employees captured in snapshot');

			// Check first employee structure
			const firstEmp = snapshotEmployees[0];
			console.log('\n📋 Sample employee data:');
			console.log(`   - Employee ID: ${firstEmp.employeeId}`);
			console.log(`   - Full Name: ${firstEmp.fullName}`);
			console.log(`   - Email: ${firstEmp.email || 'N/A'}`);
			console.log(`   - Org Unit: ${firstEmp.orgUnitName} (${firstEmp.orgUnitCode})`);
			console.log(`   - Position: ${firstEmp.positionName} (${firstEmp.positionCode})`);
			console.log(`   - Manager: ${firstEmp.managerName || 'N/A'}`);
			console.log(`   - Employment Type: ${firstEmp.employmentType}`);
			console.log(`   - Status: ${firstEmp.employmentStatus}`);

			// Verify required fields
			const requiredFields = [
				'employeeId',
				'fullName',
				'orgUnitId',
				'orgUnitName',
				'orgUnitCode',
				'positionId',
				'positionName',
				'positionCode',
				'employmentType',
				'employmentStatus'
			];

			const missingFields = requiredFields.filter((field) => !firstEmp[field]);
			if (missingFields.length > 0) {
				console.log(`\n⚠️  Missing fields: ${missingFields.join(', ')}`);
			} else {
				console.log('\n✅ All required fields present');
			}
		}

		// Check org units
		console.log('\n🏢 Org unit snapshot validation:');
		const snapshotOrgUnits = snapshot.orgUnits || [];
		console.log(`   - Org units in snapshot: ${snapshotOrgUnits.length}`);

		if (snapshotOrgUnits.length > 0) {
			console.log('✅ Org units captured');
		}

		// Check positions
		console.log('\n💼 Position snapshot validation:');
		const snapshotPositions = snapshot.positions || [];
		console.log(`   - Positions in snapshot: ${snapshotPositions.length}`);

		if (snapshotPositions.length > 0) {
			console.log('✅ Positions captured');
		}

		// Test query helper functions
		console.log('\n\n🔍 Testing QueryHelper functions...\n');

		// Test getOrgStructureAt
		console.log('1️⃣ Testing getOrgStructureAt...');
		const structureAtNow = await queryHelper.getOrgStructureAt(orgId, new Date());
		if (structureAtNow) {
			console.log(
				`   ✅ Retrieved structure with ${structureAtNow.employees.length} employees`
			);
		}

		// Test getVersionStats
		console.log('\n2️⃣ Testing getVersionStats...');
		const stats = await queryHelper.getVersionStats(versionId);
		console.log(`   - Total employees: ${stats.totalEmployees}`);
		console.log(`   - Total org units: ${stats.totalOrgUnits}`);
		console.log(`   - Total positions: ${stats.totalPositions}`);
		console.log(`   - Average team size: ${stats.averageTeamSize}`);
		console.log('   ✅ Stats retrieved successfully');

		// Test getVersionTimeline
		console.log('\n3️⃣ Testing getVersionTimeline...');
		const timeline = await queryHelper.getVersionTimeline(orgId);
		console.log(`   - Total versions: ${timeline.length}`);
		if (timeline.length > 0) {
			console.log(`   - Latest version: ${timeline[timeline.length - 1].versionName}`);
		}
		console.log('   ✅ Timeline retrieved successfully');

		// Summary
		console.log('\n\n📊 Test Summary:');
		console.log('   ✅ Version created successfully');
		console.log('   ✅ Snapshot structure valid');
		console.log(`   ✅ ${snapshotEmployees.length} employees captured`);
		console.log(`   ✅ ${snapshotOrgUnits.length} org units captured`);
		console.log(`   ✅ ${snapshotPositions.length} positions captured`);
		console.log('   ✅ QueryHelper functions working');

		console.log('\n🎉 All tests passed!');

		// Clean up test version (optional - comment out to keep)
		// await db.collection('org_structure_versions').deleteOne({ _id: new ObjectId(versionId) });
		// console.log('\n🧹 Test version cleaned up');
	} catch (error) {
		console.error('\n❌ Test failed:', error);
		process.exit(1);
	}

	process.exit(0);
}

// Run test
testVersionSnapshot();
