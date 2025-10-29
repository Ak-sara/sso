/**
 * Test script for Mermaid configuration generation
 * Tests the new config-based generator with IAS structure
 */

import { connectDB } from '../src/lib/db/connection';
import { buildDefaultMermaidConfig } from '../src/lib/utils/mermaid-config-builder';
import { generateOrgStructureMermaid } from '../src/lib/utils/mermaid-generator';
import { ObjectId } from 'mongodb';
import fs from 'fs';

async function testMermaidConfig() {
	console.log('🧪 Testing Mermaid Config Generation\n');

	const db = await connectDB();

	try {
		// Find IAS organization
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			console.error('❌ IAS organization not found');
			return;
		}

		console.log(`✅ Found IAS organization: ${ias.name}`);

		// Find version 1 for IAS (the one with actual data)
		const version = await db.collection('org_structure_versions')
			.findOne({
				$or: [
					{ organizationId: ias._id.toString() },
					{ organizationId: ias._id },
					{ organizationId: ias.code }
				],
				versionNumber: 1
			});

		if (!version) {
			console.error('❌ No org structure version found for IAS');
			return;
		}

		console.log(`✅ Found version: ${version.versionName} (v${version.versionNumber})`);
		console.log(`   Org units in snapshot: ${version.structure.orgUnits.length}`);

		// Generate default config
		console.log('\n📝 Generating default Mermaid config...');
		const config = buildDefaultMermaidConfig(version.structure.orgUnits);

		console.log(`\n✅ Config generated:`);
		console.log(`   - Logical groups: ${config.logicalGroups.length}`);
		console.log(`   - Special connections: ${config.specialConnections.length}`);
		console.log(`   - Node styles: ${Object.keys(config.nodeStyles).length}`);

		// Print logical groups
		console.log(`\n📦 Logical Groups:`);
		for (const group of config.logicalGroups) {
			console.log(`   - ${group.id}: contains ${group.contains.length} units (${group.type}, ${group.direction || 'no direction'})`);
		}

		// Print special connections
		if (config.specialConnections.length > 0) {
			console.log(`\n🔗 Special Connections:`);
			for (const conn of config.specialConnections) {
				const arrow = conn.type === 'matrix' ? '-.-> ' :
				              conn.type === 'alignment' ? '~~~ ' : '--> ';
				console.log(`   - ${conn.from} ${arrow}${conn.to}`);
			}
		}

		// Generate Mermaid diagram with config
		console.log('\n🎨 Generating Mermaid diagram with config...');
		const mermaidWithConfig = generateOrgStructureMermaid({
			...version,
			mermaidConfig: config
		});

		// Generate Mermaid diagram without config (fallback)
		console.log('🎨 Generating Mermaid diagram without config (fallback)...');
		const mermaidWithoutConfig = generateOrgStructureMermaid({
			...version,
			mermaidConfig: undefined
		});

		// Write outputs
		const outputDir = './scripts/output';
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(`${outputDir}/mermaid-with-config.md`, `# With Config\n\n\`\`\`mermaid\n${mermaidWithConfig}\n\`\`\`\n`);
		fs.writeFileSync(`${outputDir}/mermaid-without-config.md`, `# Without Config (Fallback)\n\n\`\`\`mermaid\n${mermaidWithoutConfig}\n\`\`\`\n`);
		fs.writeFileSync(`${outputDir}/mermaid-config.json`, JSON.stringify(config, null, 2));

		console.log(`\n✅ Output written to:`);
		console.log(`   - ${outputDir}/mermaid-with-config.md`);
		console.log(`   - ${outputDir}/mermaid-without-config.md`);
		console.log(`   - ${outputDir}/mermaid-config.json`);

		// Compare
		console.log(`\n📊 Comparison:`);
		console.log(`   With config:    ${mermaidWithConfig.split('\n').length} lines`);
		console.log(`   Without config: ${mermaidWithoutConfig.split('\n').length} lines`);

		// Update the version in database with the config
		console.log(`\n💾 Updating version in database with config...`);
		await db.collection('org_structure_versions').updateOne(
			{ _id: version._id },
			{
				$set: {
					mermaidConfig: config,
					mermaidDiagram: mermaidWithConfig,
					updatedAt: new Date()
				}
			}
		);

		console.log(`✅ Version updated successfully!`);
		console.log(`\n🎉 Test completed successfully!`);

	} catch (error) {
		console.error('\n❌ Test failed:', error);
	}
}

testMermaidConfig();
