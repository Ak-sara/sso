import { getDB, connectDB } from '../src/lib/db/connection';
import { versionCorrector } from '../src/lib/org-structure/corrector';

/**
 * Validation script for org_structure_versions
 *
 * Checks for:
 * - Schema compliance
 * - Data inconsistencies (missing refs, circular refs, orphaned employees)
 * - Duplicate version numbers
 * - Invalid dates
 * - Snapshot quality
 */
async function validateVersions() {
	console.log('🔍 Validating org_structure_versions...\n');

	try {
		await connectDB();
		const db = getDB();

		const versions = await db.collection('org_structure_versions').find({}).sort({ versionNumber: 1 }).toArray();
		console.log(`Found ${versions.length} versions\n`);

		let totalIssues = 0;
		const issuesByVersion: Record<string, string[]> = {};

		for (const version of versions) {
			const versionId = version._id.toString();
			const issues: string[] = [];

			console.log(`\n📋 v${version.versionNumber}: ${version.versionName}`);

			// 1. Check required fields
			if (!version.status) {
				issues.push('Missing status field');
			} else if (!['draft', 'active', 'archived'].includes(version.status)) {
				issues.push(`Invalid status: ${version.status}`);
			}

			if (!version.effectiveDate) {
				issues.push('Missing effectiveDate');
			} else if (!(version.effectiveDate instanceof Date)) {
				issues.push('effectiveDate is not a Date object');
			}

			if (!version.organizationId) {
				issues.push('Missing organizationId');
			}

			// 2. Check snapshot structure
			if (!version.structure) {
				issues.push('Missing structure object');
			} else {
				if (!Array.isArray(version.structure.orgUnits)) {
					issues.push('structure.orgUnits is not an array');
				}

				if (!Array.isArray(version.structure.positions)) {
					issues.push('structure.positions is not an array');
				}

				if (!Array.isArray(version.structure.employees)) {
					issues.push('structure.employees is not an array');
				} else if (version.structure.employees.length === 0) {
					issues.push('⚠️  Snapshot has zero employees (might be intentional)');
				} else {
					// Check employee structure
					const emp = version.structure.employees[0];
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
						issues.push(`Employee snapshot missing fields: ${missingFields.join(', ')}`);
					}
				}
			}

			// 3. Check publish status
			if (!version.publishStatus) {
				issues.push('Missing publishStatus');
			} else if (
				!['not_started', 'in_progress', 'completed', 'failed'].includes(version.publishStatus)
			) {
				issues.push(`Invalid publishStatus: ${version.publishStatus}`);
			}

			// 4. Check active version consistency
			if (version.status === 'active' && version.publishStatus !== 'completed') {
				issues.push('Active version should have publishStatus=completed');
			}

			// 5. Run inconsistency detector
			try {
				const inconsistencies = await versionCorrector.detectInconsistencies(versionId);
				if (inconsistencies.length > 0) {
					console.log(`\n   🔍 Found ${inconsistencies.length} data inconsistencies:`);
					for (const inc of inconsistencies) {
						console.log(`      - ${inc.type}: ${inc.description}`);
						issues.push(`Data inconsistency: ${inc.type}`);
					}
				}
			} catch (error: any) {
				issues.push(`Failed to check inconsistencies: ${error.message}`);
			}

			// Report issues
			if (issues.length > 0) {
				issuesByVersion[versionId] = issues;
				totalIssues += issues.length;

				console.log(`\n   ❌ Issues found: ${issues.length}`);
				issues.forEach((issue) => console.log(`      - ${issue}`));
			} else {
				console.log('   ✅ No issues');
			}
		}

		// Check for duplicate version numbers
		console.log('\n\n🔍 Checking for duplicate version numbers...');
		const versionsByOrg = new Map<string, Map<number, number>>();

		for (const v of versions) {
			if (!versionsByOrg.has(v.organizationId)) {
				versionsByOrg.set(v.organizationId, new Map());
			}

			const orgVersions = versionsByOrg.get(v.organizationId)!;
			orgVersions.set(v.versionNumber, (orgVersions.get(v.versionNumber) || 0) + 1);
		}

		let duplicates = 0;
		for (const [orgId, versionMap] of versionsByOrg) {
			for (const [num, count] of versionMap) {
				if (count > 1) {
					console.log(`   ❌ Organization ${orgId} has ${count} versions with number ${num}`);
					duplicates++;
				}
			}
		}

		if (duplicates === 0) {
			console.log('   ✅ No duplicate version numbers');
		}

		// Check for multiple active versions per org
		console.log('\n🔍 Checking for multiple active versions...');
		const activeByOrg = new Map<string, number>();

		for (const v of versions) {
			if (v.status === 'active') {
				activeByOrg.set(v.organizationId, (activeByOrg.get(v.organizationId) || 0) + 1);
			}
		}

		let multipleActive = 0;
		for (const [orgId, count] of activeByOrg) {
			if (count > 1) {
				console.log(`   ❌ Organization ${orgId} has ${count} active versions (should be 1)`);
				multipleActive++;
			}
		}

		if (multipleActive === 0) {
			console.log('   ✅ Each organization has at most 1 active version');
		}

		// Summary
		console.log('\n\n' + '='.repeat(60));
		console.log('📊 Validation Summary');
		console.log('='.repeat(60));
		console.log(`Total versions: ${versions.length}`);
		console.log(`Versions with issues: ${Object.keys(issuesByVersion).length}`);
		console.log(`Total issues: ${totalIssues}`);
		console.log(`Duplicate version numbers: ${duplicates}`);
		console.log(`Orgs with multiple active versions: ${multipleActive}`);

		if (totalIssues === 0 && duplicates === 0 && multipleActive === 0) {
			console.log('\n🎉 All validations passed!');
		} else {
			console.log('\n⚠️  Some issues found - review above');
		}

		console.log('='.repeat(60));
	} catch (error) {
		console.error('\n❌ Validation failed:', error);
		process.exit(1);
	}

	process.exit(0);
}

// Run validation
validateVersions();
