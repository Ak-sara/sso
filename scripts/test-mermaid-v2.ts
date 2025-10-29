import { getDB, connectDB } from '../src/lib/db/connection';
import { generateOrgStructureMermaid } from '../src/lib/utils/mermaid-generator';
import { generateEnhancedMermaid } from '../src/lib/utils/mermaid-generator-v2';
import { ObjectId } from 'mongodb';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * Compare old vs new Mermaid generator
 */
async function testComparison() {
	console.log('🧪 Testing Mermaid Generator V2\n');

	try {
		await connectDB();
		const db = getDB();

		const versionId = '68f511fafc205f99615b61a0';
		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) {
			console.error('❌ Version not found');
			process.exit(1);
		}

		console.log(`📋 Version: ${version.versionName}\n`);

		// Generate with old generator
		console.log('🔵 Generating with OLD generator...');
		const oldMermaid = generateOrgStructureMermaid(version as any);
		const oldLines = oldMermaid.split('\n').length;
		console.log(`   ✅ Generated ${oldLines} lines\n`);

		// Generate with new generator
		console.log('🟢 Generating with NEW generator (V2)...');
		const newMermaid = generateEnhancedMermaid(version as any);
		const newLines = newMermaid.split('\n').length;
		console.log(`   ✅ Generated ${newLines} lines\n`);

		// Analysis
		console.log('📊 Comparison:\n');

		const oldSubgraphs = (oldMermaid.match(/subgraph /g) || []).length;
		const newSubgraphs = (newMermaid.match(/subgraph /g) || []).length;
		console.log(`Subgraphs:  OLD: ${oldSubgraphs}  →  NEW: ${newSubgraphs}`);

		const oldConnections = (oldMermaid.match(/-->/g) || []).length;
		const newConnections = (newMermaid.match(/-->/g) || []).length;
		console.log(`Connections: OLD: ${oldConnections}  →  NEW: ${newConnections}`);

		const oldClasses = (oldMermaid.match(/class \w+/g) || []).length;
		const newClasses = (newMermaid.match(/class \w+/g) || []).length;
		console.log(`Classes:    OLD: ${oldClasses}  →  NEW: ${newClasses}`);

		// Check for BOD subgraph
		const hasBODSubgraph = newMermaid.includes('subgraph BOD');
		const hasDIRContainer = newMermaid.includes('subgraph DIR');
		console.log(`\nNew Features:`);
		console.log(`   ${hasBODSubgraph ? '✅' : '❌'} BOD subgraph`);
		console.log(`   ${hasDIRContainer ? '✅' : '❌'} DIR logical container`);
		console.log(`   ${newMermaid.includes('direction LR') ? '✅' : '❌'} Horizontal layout for divisions`);
		console.log(`   ${newMermaid.includes('direction TB') ? '✅' : '❌'} Vertical layout for hierarchy`);

		// Save outputs
		mkdirSync('./scripts/output', { recursive: true });

		writeFileSync(
			'./scripts/output/mermaid-old.md',
			`# Old Generator\n\n\`\`\`mermaid\n${oldMermaid}\n\`\`\`\n`
		);

		writeFileSync(
			'./scripts/output/mermaid-new.md',
			`# New Generator (V2)\n\n\`\`\`mermaid\n${newMermaid}\n\`\`\`\n`
		);

		writeFileSync(
			'./scripts/output/mermaid-comparison.md',
			`# Mermaid Generator Comparison

## Statistics

| Metric | Old | New | Change |
|--------|-----|-----|--------|
| Lines | ${oldLines} | ${newLines} | ${newLines > oldLines ? '+' : ''}${newLines - oldLines} |
| Subgraphs | ${oldSubgraphs} | ${newSubgraphs} | ${newSubgraphs > oldSubgraphs ? '+' : ''}${newSubgraphs - oldSubgraphs} |
| Connections | ${oldConnections} | ${newConnections} | ${newConnections - oldConnections} |
| Classes | ${oldClasses} | ${newClasses} | ${newClasses - oldClasses} |

## Features

| Feature | Old | New |
|---------|-----|-----|
| BOD Subgraph | ❌ | ${hasBODSubgraph ? '✅' : '❌'} |
| Logical Grouping | ❌ | ${hasDIRContainer ? '✅' : '❌'} |
| Direction Control | ✅ | ✅ |
| Node Shapes | ✅ | ✅ |
| Color Styling | ✅ | ✅ |

## Old Generator Output

\`\`\`mermaid
${oldMermaid}
\`\`\`

## New Generator (V2) Output

\`\`\`mermaid
${newMermaid}
\`\`\`
`
		);

		console.log('\n💾 Saved outputs:');
		console.log('   - scripts/output/mermaid-old.md');
		console.log('   - scripts/output/mermaid-new.md');
		console.log('   - scripts/output/mermaid-comparison.md');

		console.log('\n🎉 Test complete!');
		console.log('\nTo use the new generator:');
		console.log('1. Replace import in mermaid-generator.ts');
		console.log('2. Or update version-manager.ts to use generateEnhancedMermaid()');
	} catch (error) {
		console.error('\n❌ Test failed:', error);
		process.exit(1);
	}

	process.exit(0);
}

testComparison();
