/**
 * Check and fix org_units data
 * Query IA, CD, and other units to see their actual parentId values
 */

import { connectDB, getDB } from '../src/lib/db/connection';
import { ObjectId } from 'mongodb';

async function checkOrgUnits() {
	await connectDB();
	const db = getDB();

	console.log('🔍 Checking org_units data...\n');

	// Query specific units
	const units = await db
		.collection('org_units')
		.find({
			code: { $in: ['IA', 'CD', 'DU', 'DDB', 'DC', 'BOD'] }
		})
		.toArray();

	console.log('📊 Found units:');
	for (const unit of units) {
		console.log(`\n${unit.code} - ${unit.name}`);
		console.log(`  _id: ${unit._id}`);
		console.log(`  parentId: ${unit.parentId} (type: ${typeof unit.parentId})`);
		console.log(`  type: ${unit.type}`);
		console.log(`  level: ${unit.level}`);

		// If parentId exists, show parent name
		if (unit.parentId) {
			const parent = await db.collection('org_units').findOne({ _id: new ObjectId(unit.parentId) });
			if (parent) {
				console.log(`  ↳ Parent: ${parent.code} - ${parent.name}`);
			} else {
				console.log(`  ⚠️ Parent NOT FOUND (invalid reference!)`);
			}
		}
	}

	// Show all units with null parentId
	console.log('\n\n🔝 All units with NULL parentId (top-level):');
	const topLevel = await db
		.collection('org_units')
		.find({ parentId: null })
		.toArray();

	for (const unit of topLevel) {
		console.log(`  ${unit.code} - ${unit.name} (type: ${unit.type}, level: ${unit.level})`);
	}

	// Show all units where parentId is a string "null" or empty
	console.log('\n\n⚠️ Units with INVALID parentId (string "null", empty, etc.):');
	const invalid = await db
		.collection('org_units')
		.find({
			$or: [
				{ parentId: 'null' },
				{ parentId: '' },
				{ parentId: { $type: 'string', $exists: true } }
			]
		})
		.toArray();

	if (invalid.length > 0) {
		for (const unit of invalid) {
			console.log(`  ${unit.code} - ${unit.name}`);
			console.log(`    parentId: "${unit.parentId}" (type: ${typeof unit.parentId})`);
		}
	} else {
		console.log('  ✅ No invalid parentId values found');
	}

	process.exit(0);
}

checkOrgUnits().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
