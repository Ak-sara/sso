import { getDB, connectDB } from '../src/lib/db/connection';
import { buildOrgStructureSnapshot } from '../src/lib/org-structure/snapshot-builder';

/**
 * Migration script for existing org_structure_versions
 *
 * This script:
 * 1. Updates status enum (removes 'pending_approval')
 * 2. Builds snapshots for versions that don't have them
 * 3. Adds publishStatus and publishProgress fields
 * 4. Validates all versions
 */
async function migrateVersions() {
	console.log('🔄 Migrating org_structure_versions...\n');

	try {
		await connectDB();
		const db = getDB();

		// Get all versions
		const versions = await db.collection('org_structure_versions').find({}).toArray();
		console.log(`Found ${versions.length} versions to check\n`);

		let updated = 0;
		let snapshotsCreated = 0;
		let statusUpdated = 0;
		let errors = 0;

		for (const version of versions) {
			const versionId = version._id.toString();
			console.log(`\n📋 Processing version ${version.versionNumber}: ${version.versionName}`);

			const updates: any = {};

			// 1. Update status if it's 'pending_approval'
			if (version.status === 'pending_approval') {
				console.log('   ⚠️  Status is pending_approval, changing to draft');
				updates.status = 'draft';
				statusUpdated++;
			}

			// 2. Build snapshot if it doesn't exist or is empty
			if (!version.structure || !version.structure.employees || version.structure.employees.length === 0) {
				console.log('   ⚠️  Missing or empty snapshot, building...');

				try {
					const snapshot = await buildOrgStructureSnapshot(version.organizationId);
					updates.structure = snapshot;
					snapshotsCreated++;
					console.log(`   ✅ Built snapshot: ${snapshot.employees.length} employees, ${snapshot.orgUnits.length} org units`);
				} catch (error: any) {
					console.error(`   ❌ Failed to build snapshot: ${error.message}`);
					errors++;
					continue;
				}
			} else {
				console.log(`   ✅ Snapshot exists: ${version.structure.employees.length} employees`);
			}

			// 3. Add publishStatus if missing
			if (!version.publishStatus) {
				if (version.status === 'active') {
					updates.publishStatus = 'completed';
					console.log('   ✅ Set publishStatus to completed (active version)');
				} else {
					updates.publishStatus = 'not_started';
					console.log('   ✅ Set publishStatus to not_started');
				}
			}

			// 4. Apply updates if any
			if (Object.keys(updates).length > 0) {
				await db.collection('org_structure_versions').updateOne(
					{ _id: version._id },
					{ $set: { ...updates, updatedAt: new Date() } }
				);
				updated++;
				console.log('   ✅ Version updated');
			} else {
				console.log('   ℹ️  No updates needed');
			}
		}

		// Summary
		console.log('\n\n' + '='.repeat(60));
		console.log('✅ Migration Complete!');
		console.log('='.repeat(60));
		console.log(`📊 Total versions: ${versions.length}`);
		console.log(`✅ Updated: ${updated}`);
		console.log(`📸 Snapshots created: ${snapshotsCreated}`);
		console.log(`🔄 Status updated: ${statusUpdated}`);
		if (errors > 0) {
			console.log(`❌ Errors: ${errors}`);
		}
		console.log('='.repeat(60));

		// Validate all versions
		console.log('\n🔍 Validating all versions...\n');

		const allVersions = await db.collection('org_structure_versions').find({}).toArray();
		let valid = 0;
		let invalid = 0;

		for (const v of allVersions) {
			const issues: string[] = [];

			// Check required fields
			if (!v.status || !['draft', 'active', 'archived'].includes(v.status)) {
				issues.push('Invalid status');
			}

			if (!v.structure) {
				issues.push('Missing structure');
			} else {
				if (!v.structure.orgUnits) issues.push('Missing orgUnits array');
				if (!v.structure.positions) issues.push('Missing positions array');
				if (!v.structure.employees) issues.push('Missing employees array');
			}

			if (!v.publishStatus) {
				issues.push('Missing publishStatus');
			}

			if (issues.length > 0) {
				console.log(`❌ v${v.versionNumber}: ${issues.join(', ')}`);
				invalid++;
			} else {
				valid++;
			}
		}

		console.log(`\n✅ Valid: ${valid}`);
		if (invalid > 0) {
			console.log(`❌ Invalid: ${invalid}`);
		} else {
			console.log('🎉 All versions are valid!');
		}
	} catch (error) {
		console.error('\n❌ Migration failed:', error);
		process.exit(1);
	}

	process.exit(0);
}

// Run migration
migrateVersions();
