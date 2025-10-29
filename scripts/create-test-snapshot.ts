/**
 * Create a test snapshot with current IAS org structure
 */

import { connectDB } from '../src/lib/db/connection';
import { ObjectId } from 'mongodb';

async function createTestSnapshot() {
	console.log('📸 Creating Test Snapshot\n');

	const db = await connectDB();

	try {
		// Find IAS organization
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			console.error('❌ IAS organization not found');
			return;
		}

		console.log(`✅ Found IAS: ${ias.name}`);

		// Get all org units for IAS (handle both ObjectId and string)
		const orgUnits = await db.collection('org_units')
			.find({
				$or: [
					{ organizationId: ias._id.toString() },
					{ organizationId: ias._id },
					{ organizationId: ias.code }
				]
			})
			.sort({ level: 1, sortOrder: 1 })
			.toArray();

		console.log(`✅ Found ${orgUnits.length} org units`);

		// Get positions (handle both ObjectId and string)
		const positions = await db.collection('positions')
			.find({
				$or: [
					{ organizationId: ias._id.toString() },
					{ organizationId: ias._id },
					{ organizationId: ias.code }
				]
			})
			.toArray();

		console.log(`✅ Found ${positions.length} positions`);

		// Create snapshot structure
		const snapshot = {
			versionNumber: 1,
			versionName: 'IAS Structure 2025',
			organizationId: ias._id.toString(),
			effectiveDate: new Date('2025-01-01'),
			status: 'active',
			structure: {
				orgUnits: orgUnits.map(u => ({
					_id: u._id.toString(),
					code: u.code,
					name: u.name,
					parentId: u.parentId || undefined,
					type: u.type,
					level: u.level,
					sortOrder: u.sortOrder,
					headEmployeeId: u.managerId || undefined
				})),
				positions: positions.map(p => ({
					_id: p._id.toString(),
					code: p.code,
					name: p.name,
					level: p.level,
					grade: p.grade || '',
					reportingToPositionId: undefined
				})),
				employees: [],
				snapshotCreatedAt: new Date()
			},
			changes: [],
			reassignments: [],
			createdBy: 'system',
			createdAt: new Date(),
			updatedAt: new Date()
		};

		// Insert or update
		const existing = await db.collection('org_structure_versions')
			.findOne({ organizationId: ias._id.toString(), versionNumber: 1 });

		if (existing) {
			console.log(`\n📝 Updating existing snapshot (v1)...`);
			await db.collection('org_structure_versions').updateOne(
				{ _id: existing._id },
				{ $set: snapshot }
			);
			console.log(`✅ Snapshot updated: ${existing._id.toString()}`);
		} else {
			console.log(`\n📝 Creating new snapshot...`);
			const result = await db.collection('org_structure_versions').insertOne(snapshot);
			console.log(`✅ Snapshot created: ${result.insertedId.toString()}`);
		}

		console.log(`\n🎉 Done!`);

	} catch (error) {
		console.error('\n❌ Error:', error);
	}
}

createTestSnapshot();
