import { getDB, connectDB } from '../src/lib/db/connection';
import { versionManager } from '../src/lib/org-structure/version-manager';
import { queryHelper } from '../src/lib/org-structure/query-helper';
import { ObjectId } from 'mongodb';

/**
 * Simple test that creates minimal test data and verifies snapshot works
 */
async function testSnapshot() {
	console.log('🧪 Simple Snapshot Test\n');

	try {
		await connectDB();
		const db = getDB();

		// Create test organization
		console.log('1️⃣ Creating test organization...');
		const orgResult = await db.collection('organizations').insertOne({
			code: 'TEST_ORG',
			name: 'Test Organization',
			realm: 'test-realm',
			isActive: true,
			createdAt: new Date()
		});
		const orgId = orgResult.insertedId.toString();
		console.log(`   ✅ Created org: ${orgId}\n`);

		// Create 2 org units
		console.log('2️⃣ Creating org units...');
		const unit1 = await db.collection('org_units').insertOne({
			code: 'IT',
			name: 'IT Department',
			organizationId: orgResult.insertedId,
			unitType: 'department',
			parentId: null,
			createdAt: new Date()
		});

		const unit2 = await db.collection('org_units').insertOne({
			code: 'HR',
			name: 'HR Department',
			organizationId: orgResult.insertedId,
			unitType: 'department',
			parentId: null,
			createdAt: new Date()
		});
		console.log(`   ✅ Created 2 org units\n`);

		// Create 2 positions
		console.log('3️⃣ Creating positions...');
		const pos1 = await db.collection('positions').insertOne({
			code: 'MGR',
			name: 'Manager',
			organizationId: orgResult.insertedId,
			level: 'M3',
			grade: '10',
			createdAt: new Date()
		});

		const pos2 = await db.collection('positions').insertOne({
			code: 'DEV',
			name: 'Developer',
			organizationId: orgResult.insertedId,
			level: 'S2',
			grade: '7',
			createdAt: new Date()
		});
		console.log(`   ✅ Created 2 positions\n`);

		// Create 3 employees
		console.log('4️⃣ Creating employee identities...');
		await db.collection('identities').insertMany([
			{
				identityType: 'employee',
				employeeId: 'TEST001',
				email: 'john@test.com',
				username: 'john',
				firstName: 'John',
				lastName: 'Doe',
				fullName: 'John Doe',
				organizationId: orgId,
				orgUnitId: unit1.insertedId,
				positionId: pos1.insertedId,
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: new Date('2024-01-01'),
				isActive: true,
				createdAt: new Date()
			},
			{
				identityType: 'employee',
				employeeId: 'TEST002',
				email: 'jane@test.com',
				username: 'jane',
				firstName: 'Jane',
				lastName: 'Smith',
				fullName: 'Jane Smith',
				organizationId: orgId,
				orgUnitId: unit1.insertedId,
				positionId: pos2.insertedId,
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: new Date('2024-02-01'),
				isActive: true,
				createdAt: new Date()
			},
			{
				identityType: 'employee',
				employeeId: 'TEST003',
				email: 'bob@test.com',
				username: 'bob',
				firstName: 'Bob',
				lastName: 'Johnson',
				fullName: 'Bob Johnson',
				organizationId: orgId,
				orgUnitId: unit2.insertedId,
				positionId: pos1.insertedId,
				employmentType: 'pkwt',
				employmentStatus: 'active',
				joinDate: new Date('2024-03-01'),
				isActive: true,
				createdAt: new Date()
			}
		]);
		console.log(`   ✅ Created 3 employees\n`);

		// Now create a version snapshot
		console.log('5️⃣ Creating version with snapshot...');
		const versionId = await versionManager.createVersion(
			orgId,
			'Test Version v1.0',
			new Date(),
			'Testing snapshot functionality'
		);
		console.log(`   ✅ Version created: ${versionId}\n`);

		// Verify snapshot
		console.log('6️⃣ Verifying snapshot...');
		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) {
			throw new Error('Version not found!');
		}

		const snapshot = version.structure;

		console.log('   📊 Snapshot contents:');
		console.log(`      - Org units: ${snapshot.orgUnits?.length || 0}`);
		console.log(`      - Positions: ${snapshot.positions?.length || 0}`);
		console.log(`      - Employees: ${snapshot.employees?.length || 0}`);

		if (snapshot.orgUnits?.length !== 2) {
			throw new Error(`Expected 2 org units, got ${snapshot.orgUnits?.length || 0}`);
		}

		if (snapshot.positions?.length !== 2) {
			throw new Error(`Expected 2 positions, got ${snapshot.positions?.length || 0}`);
		}

		if (snapshot.employees?.length !== 3) {
			throw new Error(`Expected 3 employees, got ${snapshot.employees?.length || 0}`);
		}

		console.log('   ✅ All counts correct!\n');

		// Check employee denormalization
		console.log('7️⃣ Verifying employee denormalization...');
		const emp = snapshot.employees[0];
		console.log('   📋 Sample employee:');
		console.log(`      - NIK: ${emp.employeeId}`);
		console.log(`      - Name: ${emp.fullName}`);
		console.log(`      - Org Unit: ${emp.orgUnitName} (${emp.orgUnitCode})`);
		console.log(`      - Position: ${emp.positionName} (${emp.positionCode})`);

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

		const missingFields = requiredFields.filter((f) => !emp[f]);
		if (missingFields.length > 0) {
			throw new Error(`Missing fields: ${missingFields.join(', ')}`);
		}

		console.log('   ✅ All fields present and denormalized!\n');

		// Activate version for historical queries
		console.log('8️⃣ Activating version...');
		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: { status: 'active' } }
		);
		console.log('   ✅ Version activated\n');

		// Test QueryHelper
		console.log('9️⃣ Testing QueryHelper functions...');

		const stats = await queryHelper.getVersionStats(versionId);
		console.log(`   - Total employees: ${stats.totalEmployees}`);
		console.log(`   - Total org units: ${stats.totalOrgUnits}`);
		console.log(`   - Average team size: ${stats.averageTeamSize}`);
		console.log('   ✅ Stats working!\n');

		// Test historical query
		const structureNow = await queryHelper.getOrgStructureAt(orgId, new Date());
		if (!structureNow) {
			throw new Error('Could not retrieve structure at current date');
		}
		console.log(`   ✅ Historical query working (found ${structureNow.employees.length} employees)\n`);

		// Clean up
		console.log('🔟 Cleaning up test data...');
		await db.collection('organizations').deleteOne({ _id: orgResult.insertedId });
		await db.collection('org_units').deleteMany({ organizationId: orgResult.insertedId });
		await db.collection('positions').deleteMany({ organizationId: orgResult.insertedId });
		await db.collection('identities').deleteMany({ organizationId: orgId });
		await db.collection('org_structure_versions').deleteOne({ _id: new ObjectId(versionId) });
		console.log('   ✅ Cleaned up\n');

		console.log('🎉 ALL TESTS PASSED!\n');
		console.log('✅ Snapshot captures org units correctly');
		console.log('✅ Snapshot captures positions correctly');
		console.log('✅ Snapshot captures employees correctly');
		console.log('✅ Employee data is fully denormalized');
		console.log('✅ QueryHelper functions work');
		console.log('✅ Historical queries work');
	} catch (error) {
		console.error('\n❌ TEST FAILED:', error);
		process.exit(1);
	}

	process.exit(0);
}

testSnapshot();
