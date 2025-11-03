/**
 * Query all directors and BOD structure
 */

import { connectDB, getDB } from '../src/lib/db/connection';

async function queryDirectors() {
	await connectDB();
	const db = getDB();

	console.log('🔍 Querying director structure...\n');

	// Find BOD
	const bod = await db.collection('org_units').findOne({ code: 'BOD' });
	console.log('BOD:', bod ? `${bod.code} - ${bod.name} (id: ${bod._id})` : '❌ NOT FOUND');

	// Find all directorates
	const directors = await db
		.collection('org_units')
		.find({ type: 'directorate' })
		.sort({ level: 1, code: 1 })
		.toArray();

	console.log('\n📊 All Directorates:');
	for (const dir of directors) {
		const parent = dir.parentId
			? await db.collection('org_units').findOne({ _id: dir.parentId })
			: null;

		console.log(`\n${dir.code} - ${dir.name}`);
		console.log(`  Level: ${dir.level}`);
		console.log(`  ParentId: ${dir.parentId || 'NULL'}`);
		if (parent) {
			console.log(`  ↳ Parent: ${parent.code} - ${parent.name}`);
		} else if (dir.parentId) {
			console.log(`  ⚠️ Parent NOT FOUND (invalid!)`);
		}

		// Show children
		const children = await db
			.collection('org_units')
			.find({ parentId: dir._id })
			.toArray();

		if (children.length > 0) {
			console.log(`  Children (${children.length}):`);
			for (const child of children.slice(0, 5)) {
				console.log(`    - ${child.code} - ${child.name}`);
			}
			if (children.length > 5) {
				console.log(`    ... and ${children.length - 5} more`);
			}
		}
	}

	process.exit(0);
}

queryDirectors().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
