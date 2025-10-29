import { getDB, connectDB } from '../src/lib/db/connection';

/**
 * Fix org_units hierarchy to match DOCS/example_org_structure.md
 *
 * Issue: All directors (DC, DO, DR, DK, DH) are children of BOD
 * Expected: All directors should be children of DU (Direktur Utama)
 */
async function fixOrgHierarchy() {
	console.log('🔧 Fixing Org Structure Hierarchy\n');

	try {
		await connectDB();
		const db = getDB();

		// Find IAS organization
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			console.error('❌ IAS organization not found');
			process.exit(1);
		}

		const orgId = ias._id.toString();
		console.log(`✅ Found IAS: ${orgId}\n`);

		// Find DU (Direktur Utama) - organizationId might be string or ObjectId
		const du = await db.collection('org_units').findOne({
			code: 'DU',
			$or: [{ organizationId: ias._id }, { organizationId: orgId }]
		});

		if (!du) {
			console.error('❌ DU (Direktur Utama) not found');
			process.exit(1);
		}

		console.log(`✅ Found DU: ${du._id}\n`);

		// Directors that should be under DU
		const directors = ['DC', 'DO', 'DR', 'DK', 'DH'];

		console.log('📝 Updating directors to be children of DU...\n');

		for (const code of directors) {
			const unit = await db.collection('org_units').findOne({
				code,
				$or: [{ organizationId: ias._id }, { organizationId: orgId }]
			});

			if (!unit) {
				console.log(`   ⚠️  ${code} not found, skipping`);
				continue;
			}

			const oldParent = unit.parentId ? unit.parentId.toString() : 'null';
			console.log(`   ${code} (${unit.name})`);
			console.log(`      Old parent: ${oldParent}`);
			console.log(`      New parent: ${du._id}`);

			await db.collection('org_units').updateOne(
				{ _id: unit._id },
				{
					$set: {
						parentId: du._id,
						updatedAt: new Date()
					}
				}
			);

			console.log(`      ✅ Updated\n`);
		}

		// Verify the structure
		console.log('\n✅ Verification:\n');

		const allUnits = await db
			.collection('org_units')
			.find({
				$or: [{ organizationId: ias._id }, { organizationId: orgId }]
			})
			.toArray();

		function printTree(code: string, indent: string = '', printed: Set<string> = new Set()) {
			if (printed.has(code)) return;
			printed.add(code);

			const unit = allUnits.find((u) => u.code === code);
			if (!unit) return;

			console.log(`${indent}${code} - ${unit.name}`);

			const children = allUnits.filter((u) => u.parentId?.toString() === unit._id.toString());
			children.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

			children.forEach((child, i) => {
				const isLast = i === children.length - 1;
				const newIndent = indent + (isLast ? '└── ' : '├── ');
				printTree(child.code, newIndent, printed);
			});
		}

		printTree('BOD');

		console.log('\n🎉 Hierarchy fixed successfully!');
		console.log('\nNow the structure matches DOCS/example_org_structure.md:');
		console.log('BOD → DU → [DC, DO, DR, DK, DH, DDB]');
		console.log('BOD → SBUCL');
	} catch (error) {
		console.error('\n❌ Fix failed:', error);
		process.exit(1);
	}

	process.exit(0);
}

fixOrgHierarchy();
