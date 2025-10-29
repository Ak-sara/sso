#!/usr/bin/env bun

/**
 * Database Export Script
 *
 * Exports MongoDB collections to CSV files with human-readable references.
 *
 * Usage:
 *   bun run scripts/db-export.ts                    # Export all collections (configured columns)
 *   bun run scripts/db-export.ts identities         # Export specific collection
 *   bun run scripts/db-export.ts --auto-detect      # Export all collections (auto-detect all fields)
 *   bun run scripts/db-export.ts identities --auto  # Export with auto-detected columns
 *   bun run scripts/db-export.ts --output ./backup/ # Custom output directory
 *
 * Modes:
 *   Default: Uses hardcoded column configuration (maintains consistency)
 *   --auto-detect: Scans database and exports ALL fields (adapts to schema changes)
 */

import { connectDB, disconnectDB, getDB } from '../src/lib/db/connection';
import { exportCollectionToFile, COLLECTION_CONFIGS } from '../src/lib/utils/csv-exporter';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DEFAULT_OUTPUT_DIR = './scripts/output';

async function main() {
	const args = process.argv.slice(2);

	// Parse arguments
	let outputDir = DEFAULT_OUTPUT_DIR;
	let collectionName: string | null = null;
	let exportAll = false;
	let autoDetect = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--output' || arg === '-o') {
			outputDir = args[++i];
		} else if (arg === '--all' || arg === '-a') {
			exportAll = true;
		} else if (arg === '--auto-detect' || arg === '--auto') {
			autoDetect = true;
		} else if (!collectionName) {
			collectionName = arg;
		}
	}

	// Determine what to export
	if (!collectionName && !exportAll) {
		exportAll = true; // Default: export all
	}

	// Ensure output directory exists
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
		console.log(`✓ Created output directory: ${outputDir}`);
	}

	// Connect to database
	await connectDB();
	const db = getDB();

	try {
		if (exportAll) {
			console.log(`📦 Exporting all collections${autoDetect ? ' (auto-detect mode)' : ''}...\n`);

			const collections = Object.keys(COLLECTION_CONFIGS);
			let successCount = 0;

			for (const collection of collections) {
				const config = COLLECTION_CONFIGS[collection];
				const outputPath = join(outputDir, `${collection}.csv`);

				try {
					await exportCollectionToFile(db, config, outputPath, { autoDetect });
					successCount++;
				} catch (error) {
					console.error(`✗ Failed to export ${collection}:`, error);
				}
			}

			console.log(`\n✓ Exported ${successCount}/${collections.length} collections to ${outputDir}`);
		} else if (collectionName) {
			console.log(`📦 Exporting ${collectionName}${autoDetect ? ' (auto-detect mode)' : ''}...\n`);

			const config = COLLECTION_CONFIGS[collectionName];
			if (!config) {
				console.error(`✗ Unknown collection: ${collectionName}`);
				console.error(`Available collections: ${Object.keys(COLLECTION_CONFIGS).join(', ')}`);
				process.exit(1);
			}

			const outputPath = join(outputDir, `${collectionName}.csv`);
			await exportCollectionToFile(db, config, outputPath, { autoDetect });

			console.log(`\n✓ Exported ${collectionName} to ${outputPath}`);
		}

		await disconnectDB();
		process.exit(0);
	} catch (error) {
		console.error('✗ Export failed:', error);
		await disconnectDB();
		process.exit(1);
	}
}

// Run
main();
