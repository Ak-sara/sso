/**
 * Test the mermaid generator with actual data
 */

import { connectDB, getDB } from '../src/lib/db/connection';
import { generateOrgStructureMermaid } from '../src/lib/utils/mermaid-generator';

async function testGenerator() {
	await connectDB();
	const db = getDB();

	console.log('🔍 Testing Mermaid Generator...\n');

	const version = await db
		.collection('org_structure_versions')
		.findOne({ status: 'active' });

	if (!version) {
		console.log('❌ No active org structure version found');
		process.exit(1);
	}

	console.log('📊 Version:', version.versionName);
	console.log('\n📋 Current Mermaid Config:');
	console.log(JSON.stringify(version.mermaidConfig, null, 2));

	console.log('\n\n🎨 Generated Mermaid Diagram:');
	console.log('═'.repeat(80));

	const mermaidDiagram = generateOrgStructureMermaid(version as any);
	console.log(mermaidDiagram);

	console.log('═'.repeat(80));

	process.exit(0);
}

testGenerator().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
