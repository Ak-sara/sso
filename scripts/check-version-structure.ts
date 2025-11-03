/**
 * Check if DC exists in active version structure
 */

import { connectDB, getDB } from '../src/lib/db/connection';

async function checkStructure() {
	await connectDB();
	const db = getDB();

	const version = await db.collection('org_structure_versions').findOne({ status: 'active' });

	if (!version) {
		console.log('❌ No active version found');
		process.exit(1);
	}

	console.log('📊 Version:', version.versionName);
	console.log('Total units in structure:', version.structure.orgUnits.length);
	console.log('\n🔍 Checking for DC (Direktur Komersial)...');

	const dc = version.structure.orgUnits.find((u: any) => u.code === 'DC');

	if (dc) {
		console.log('✅ DC found in structure:');
		console.log(JSON.stringify(dc, null, 2));
	} else {
		console.log('❌ DC NOT found in structure');
		console.log('\n📋 Available director codes:');
		const directors = version.structure.orgUnits.filter((u: any) => u.type === 'directorate');
		console.log(directors.map((d: any) => d.code).join(', '));
	}

	console.log('\n🔍 Checking mermaid config...');
	console.log('Logical groups:', version.mermaidConfig?.logicalGroups?.map((g: any) => g.id).join(', '));
	console.log('\nSpecial connections:');
	console.log(JSON.stringify(version.mermaidConfig?.specialConnections || [], null, 2));

	process.exit(0);
}

checkStructure().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
