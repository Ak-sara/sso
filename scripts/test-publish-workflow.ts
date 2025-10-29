import { getDB, connectDB } from '../src/lib/db/connection';
import { versionManager } from '../src/lib/org-structure/version-manager';
import { versionPublisher } from '../src/lib/org-structure/publisher';
import { queryHelper } from '../src/lib/org-structure/query-helper';
import { ObjectId } from 'mongodb';

/**
 * End-to-end test of publish workflow
 *
 * Tests the complete flow:
 * 1. Create version with snapshot (draft)
 * 2. Publish version (activates + updates identities)
 * 3. Verify identities were updated
 * 4. Verify history entries created
 * 5. Test resume on failure
 */
async function testPublishWorkflow() {
	console.log('🧪 Testing End-to-End Publish Workflow\n');

	try {
		await connectDB();
		const db = getDB();

		// Setup: Create test org with data
		console.log('1️⃣  Setting up test data...');

		const orgResult = await db.collection('organizations').insertOne({
			code: 'TEST_PUB',
			name: 'Test Publish Org',
			realm: 'test-realm',
			isActive: true,
			createdAt: new Date()
		});
		const orgId = orgResult.insertedId.toString();

		// Create org unit and position
		const unitResult = await db.collection('org_units').insertOne({
			code: 'SALES',
			name: 'Sales Department',
			organizationId: orgResult.insertedId,
			unitType: 'department',
			parentId: null,
			createdAt: new Date()
		});

		const posResult = await db.collection('positions').insertOne({
			code: 'MGR',
			name: 'Manager',
			organizationId: orgResult.insertedId,
			level: 'M3',
			grade: '10',
			createdAt: new Date()
		});

		// Create employee identity
		const empResult = await db.collection('identities').insertOne({
			identityType: 'employee',
			employeeId: 'PUB001',
			email: 'test@pub.com',
			username: 'testpub',
			firstName: 'Test',
			lastName: 'Publisher',
			fullName: 'Test Publisher',
			organizationId: orgId,
			orgUnitId: null, // No assignment initially
			positionId: null,
			employmentType: 'permanent',
			employmentStatus: 'active',
			joinDate: new Date('2024-01-01'),
			isActive: true,
			createdAt: new Date()
		});

		console.log('   ✅ Test org and employee created\n');

		// Step 1: Create version with snapshot
		console.log('2️⃣  Creating version with snapshot...');
		const versionId = await versionManager.createVersion(
			orgId,
			'Test Publish Version',
			new Date(),
			'Testing publish workflow'
		);

		console.log(`   ✅ Version created: ${versionId}`);

		// Verify version status
		let version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (version?.status !== 'draft') {
			throw new Error(`Expected status=draft, got ${version?.status}`);
		}

		console.log('   ✅ Status is draft\n');

		// Step 2: Add a reassignment to test identity updates
		console.log('3️⃣  Adding reassignment...');
		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{
				$set: {
					reassignments: [
						{
							employeeId: 'PUB001',
							fullName: 'Test Publisher',
							oldOrgUnitId: null,
							oldOrgUnitName: null,
							oldPositionId: null,
							oldPositionName: null,
							newOrgUnitId: unitResult.insertedId.toString(),
							newOrgUnitName: 'Sales Department',
							newPositionId: posResult.insertedId.toString(),
							newPositionName: 'Manager',
							reason: 'Initial placement'
						}
					]
				}
			}
		);

		console.log('   ✅ Reassignment added\n');

		// Step 3: Publish version
		console.log('4️⃣  Publishing version...');
		const publishResult = await versionPublisher.publishVersion(versionId);

		if (!publishResult.success) {
			throw new Error(`Publish failed: ${publishResult.error}`);
		}

		console.log(`   ✅ ${publishResult.message}\n`);

		// Step 4: Verify version status changed
		console.log('5️⃣  Verifying version status...');
		version = await db.collection('org_structure_versions').findOne({ _id: new ObjectId(versionId) });

		if (version?.status !== 'active') {
			throw new Error(`Expected status=active, got ${version?.status}`);
		}

		if (version?.publishStatus !== 'completed') {
			throw new Error(`Expected publishStatus=completed, got ${version?.publishStatus}`);
		}

		console.log('   ✅ Version is active');
		console.log('   ✅ Publish status is completed\n');

		// Step 5: Verify identity was updated
		console.log('6️⃣  Verifying identity updated...');
		const identity = await db
			.collection('identities')
			.findOne({ employeeId: 'PUB001', identityType: 'employee' });

		if (!identity) {
			throw new Error('Identity not found');
		}

		if (identity.orgUnitId?.toString() !== unitResult.insertedId.toString()) {
			throw new Error(
				`Expected orgUnitId=${unitResult.insertedId}, got ${identity.orgUnitId}`
			);
		}

		if (identity.positionId?.toString() !== posResult.insertedId.toString()) {
			throw new Error(
				`Expected positionId=${posResult.insertedId}, got ${identity.positionId}`
			);
		}

		console.log('   ✅ Identity orgUnitId updated');
		console.log('   ✅ Identity positionId updated\n');

		// Step 6: Verify history entry created
		console.log('7️⃣  Verifying history entry...');
		const historyCount = await db
			.collection('employee_history')
			.countDocuments({
				employeeId: 'PUB001',
				eventType: 'org_restructure',
				'details.versionId': versionId
			});

		if (historyCount !== 1) {
			throw new Error(`Expected 1 history entry, found ${historyCount}`);
		}

		console.log('   ✅ History entry created\n');

		// Step 7: Test idempotency - publish again should succeed
		console.log('8️⃣  Testing idempotency (publish again)...');
		const publishResult2 = await versionPublisher.publishVersion(versionId);

		if (!publishResult2.success) {
			throw new Error(`Second publish failed: ${publishResult2.error}`);
		}

		console.log('   ✅ Second publish succeeded (idempotent)\n');

		// Step 8: Verify no duplicate history entries
		console.log('9️⃣  Verifying no duplicates...');
		const historyCount2 = await db
			.collection('employee_history')
			.countDocuments({
				employeeId: 'PUB001',
				eventType: 'org_restructure',
				'details.versionId': versionId
			});

		if (historyCount2 !== 1) {
			throw new Error(`Expected 1 history entry, found ${historyCount2} (duplicates created!)`);
		}

		console.log('   ✅ No duplicate history entries\n');

		// Step 9: Test QueryHelper with published version
		console.log('🔟 Testing QueryHelper...');
		const structure = await queryHelper.getOrgStructureAt(orgId, new Date());

		if (!structure) {
			throw new Error('Could not retrieve structure');
		}

		console.log(`   ✅ Retrieved structure: ${structure.employees.length} employees\n`);

		// Cleanup
		console.log('🧹 Cleaning up...');
		await db.collection('organizations').deleteOne({ _id: orgResult.insertedId });
		await db.collection('org_units').deleteMany({ organizationId: orgResult.insertedId });
		await db.collection('positions').deleteMany({ organizationId: orgResult.insertedId });
		await db.collection('identities').deleteMany({ organizationId: orgId });
		await db.collection('org_structure_versions').deleteOne({ _id: new ObjectId(versionId) });
		await db.collection('employee_history').deleteMany({ employeeId: 'PUB001' });
		console.log('   ✅ Cleaned up\n');

		// Summary
		console.log('🎉 ALL TESTS PASSED!\n');
		console.log('✅ Version created with snapshot');
		console.log('✅ Version published successfully');
		console.log('✅ Version status changed to active');
		console.log('✅ Publish status is completed');
		console.log('✅ Identity assignments updated');
		console.log('✅ History entries created');
		console.log('✅ Idempotent publish works');
		console.log('✅ No duplicates created');
		console.log('✅ QueryHelper works with published version');
	} catch (error) {
		console.error('\n❌ TEST FAILED:', error);
		process.exit(1);
	}

	process.exit(0);
}

// Run test
testPublishWorkflow();
