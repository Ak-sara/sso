#!/usr/bin/env bun
/**
 * Cleanup redundant fields from org_units collection
 *
 * Removes:
 * - unitType (duplicate of type)
 * - organization (duplicate of organizationId)
 *
 * Usage:
 *   bun run scripts/cleanup-org-units-fields.ts --dry-run    # Preview changes
 *   bun run scripts/cleanup-org-units-fields.ts              # Execute cleanup
 */

import { connectDB, getDB } from '../src/lib/db/connection';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
	console.log('🧹 Org Units Field Cleanup Script\n');
	console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (preview only)' : '⚠️  LIVE (will modify database)'}\n`);

	await connectDB();
	const db = getDB();
	
	try {
		// Find documents with redundant fields
		const unitsWithRedundantFields = await db
			.collection('org_units')
			.find({
				$or: [{ unitType: { $exists: true } }, { organization: { $exists: true } }]
			})
			.toArray();

		console.log(`📊 Found ${unitsWithRedundantFields.length} documents with redundant fields\n`);

		if (unitsWithRedundantFields.length === 0) {
			console.log('✅ No cleanup needed - all documents are already clean!');
			process.exit(0);
		}

		// Analyze what will be removed
		let unitTypeCount = 0;
		let organizationCount = 0;

		for (const unit of unitsWithRedundantFields) {
			if (unit.unitType) unitTypeCount++;
			if (unit.organization) organizationCount++;
		}

		console.log('📋 Fields to remove:');
		console.log(`   - unitType: ${unitTypeCount} documents`);
		console.log(`   - organization: ${organizationCount} documents\n`);

		if (isDryRun) {
			console.log('🔍 DRY RUN - Sample documents that would be affected:\n');
			const sample = unitsWithRedundantFields.slice(0, 3);
			for (const unit of sample) {
				console.log(`   ${unit.code} - ${unit.name}`);
				if (unit.unitType) console.log(`      Has unitType: ${unit.unitType}`);
				if (unit.organization) console.log(`      Has organization: ${unit.organization}`);
				console.log('');
			}

			if (unitsWithRedundantFields.length > 3) {
				console.log(`   ... and ${unitsWithRedundantFields.length - 3} more\n`);
			}

			console.log('💡 Run without --dry-run to execute cleanup');
			process.exit(0);
		}

		// Execute cleanup
		console.log('⚙️  Executing cleanup...\n');

		const result = await db.collection('org_units').updateMany(
			{
				$or: [{ unitType: { $exists: true } }, { organization: { $exists: true } }]
			},
			{
				$unset: {
					unitType: '',
					organization: ''
				}
			}
		);

		console.log(`✅ Cleanup completed!`);
		console.log(`   Modified: ${result.modifiedCount} documents\n`);

		// Verify cleanup
		const remaining = await db
			.collection('org_units')
			.countDocuments({
				$or: [{ unitType: { $exists: true } }, { organization: { $exists: true } }]
			});

		if (remaining === 0) {
			console.log('✅ Verification passed - all redundant fields removed!');
		} else {
			console.log(`⚠️  Warning: ${remaining} documents still have redundant fields`);
		}
	} catch (err) {
		console.error('❌ Error during cleanup:', err);
		process.exit(1);
	}

	process.exit(0);
}

main();
