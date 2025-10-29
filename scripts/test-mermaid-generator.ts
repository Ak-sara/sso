import { getDB, connectDB } from '../src/lib/db/connection';
import { generateOrgStructureMermaid } from '../src/lib/utils/mermaid-generator';
import { ObjectId } from 'mongodb';

/**
 * Test the mermaid generator to ensure it doesn't create recursive subgraph errors
 */
async function testMermaidGenerator() {
	console.log('🧪 Testing Mermaid Generator\n');

	try {
		await connectDB();
		const db = getDB();

		// Get the version in question
		const versionId = '68f511fafc205f99615b61a0';
		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) {
			console.error('❌ Version not found');
			process.exit(1);
		}

		console.log(`📋 Version: ${version.versionName}`);
		console.log(`📊 Structure:`);
		console.log(`   - Org Units: ${version.structure?.orgUnits?.length || 0}`);
		console.log(`   - Positions: ${version.structure?.positions?.length || 0}`);
		console.log(`   - Employees: ${version.structure?.employees?.length || 0}\n`);

		// Check for SBU units
		const sbuUnits = version.structure?.orgUnits?.filter(
			(u: any) => u.type === 'sbu' || u.code?.startsWith('SBU')
		);

		console.log(`🔍 Found ${sbuUnits?.length || 0} SBU units:`);
		for (const sbu of sbuUnits || []) {
			console.log(`   - ${sbu.code}: ${sbu.name} (type: ${sbu.type})`);
		}
		console.log();

		// Generate mermaid diagram
		console.log('🎨 Generating Mermaid diagram...');
		const mermaid = generateOrgStructureMermaid(version as any);

		console.log('✅ Mermaid generated successfully\n');

		// Check for issues
		const lines = mermaid.split('\n');
		console.log(`📏 Generated ${lines.length} lines\n`);

		// Check for SBUCL references
		const sbuclLines = lines.filter((line) => line.includes('SBUCL'));
		if (sbuclLines.length > 0) {
			console.log(`🔍 SBUCL references (${sbuclLines.length}):`);
			sbuclLines.forEach((line, i) => {
				console.log(`   ${i + 1}. ${line.trim()}`);
			});
			console.log();
		}

		// Look for potential recursive issues
		const subgraphPattern = /subgraph\s+(\w+)/g;
		const nodePattern = /^\s+(\w+)\[/;

		const subgraphs = new Set<string>();
		const nodes = new Set<string>();

		for (const line of lines) {
			const subgraphMatch = line.match(subgraphPattern);
			if (subgraphMatch) {
				subgraphs.add(subgraphMatch[1]);
			}

			const nodeMatch = line.match(nodePattern);
			if (nodeMatch) {
				nodes.add(nodeMatch[1]);
			}
		}

		console.log('🔍 Checking for recursion issues...');
		const recursive = Array.from(subgraphs).filter((sg) => nodes.has(sg));
		if (recursive.length > 0) {
			console.log(`   ❌ Found recursive references: ${recursive.join(', ')}`);
			console.log('   These nodes are both subgraphs AND nodes inside subgraphs\n');
		} else {
			console.log('   ✅ No recursive references found\n');
		}

		// Save to file for manual inspection
		const fs = await import('fs');
		const outputPath = './scripts/output/test-mermaid.md';
		await fs.promises.mkdir('./scripts/output', { recursive: true });
		await fs.promises.writeFile(
			outputPath,
			`# Test Mermaid Output\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n`
		);
		console.log(`💾 Saved mermaid to: ${outputPath}\n`);

		console.log('🎉 Test complete!');
		console.log('\n📝 Summary:');
		console.log(`   - Version ID: ${versionId}`);
		console.log(`   - SBU units: ${sbuUnits?.length || 0}`);
		console.log(`   - Mermaid lines: ${lines.length}`);
		console.log(`   - Subgraphs: ${subgraphs.size}`);
		console.log(`   - Nodes: ${nodes.size}`);
		console.log(`   - Recursive issues: ${recursive.length}`);
	} catch (error) {
		console.error('\n❌ Test failed:', error);
		process.exit(1);
	}

	process.exit(0);
}

testMermaidGenerator();
