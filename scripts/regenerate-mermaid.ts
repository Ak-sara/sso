/**
 * Force regenerate mermaid diagram with fixed nested algorithm
 */

import { connectDB, getDB } from '../src/lib/db/connection';
import { generateOrgStructureMermaid } from '../src/lib/utils/mermaid-generator';

async function regenerate() {
	await connectDB();
	const db = getDB();

	console.log('🔄 Regenerating mermaid diagrams...\n');

	// Get active version
	const version = await db
		.collection('org_structure_versions')
		.findOne({ status: 'active' });

	if (!version) {
		console.log('❌ No active version found');
		process.exit(1);
	}

	console.log('📊 Regenerating:', version.versionName);
	console.log('Current config logicalGroups:');
	console.log(JSON.stringify(version.mermaidConfig?.logicalGroups || [], null, 2));

	// Generate NEW diagram with fixed algorithm
	const newDiagram = generateOrgStructureMermaid(version as any);

	console.log('\n🎨 NEW Generated Diagram (first 100 lines):');
	console.log('═'.repeat(80));
	const lines = newDiagram.split('\n');
	console.log(lines.slice(0, 100).join('\n'));
	console.log('═'.repeat(80));

	// Update database
	await db.collection('org_structure_versions').updateOne(
		{ _id: version._id },
		{
			$set: {
				mermaidDiagram: newDiagram,
				updatedAt: new Date()
			}
		}
	);

	console.log('\n✅ Database updated successfully!');
	console.log('🌐 Refresh your browser to see the new diagram');

	process.exit(0);
}

regenerate().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
