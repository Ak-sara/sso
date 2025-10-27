#!/usr/bin/env bun

/**
 * Database Import Script
 *
 * Imports CSV files into MongoDB collections with reference resolution.
 *
 * Usage:
 *   bun run scripts/db-import.ts identities ./data/identities.csv    # Import specific collection
 *   bun run scripts/db-import.ts --dir ./data/                       # Import all CSV files from directory
 *   bun run scripts/db-import.ts --validate-only ./data/identities.csv  # Validate without importing
 */

import { connectDB, disconnectDB, getDB } from '../src/lib/db/connection';
import { parseCSVFile, normalizeCSVRow } from '../src/lib/utils/csv-parser';
import { buildCache, resolveReferences } from '../src/lib/utils/reference-resolver';
import { readdirSync } from 'fs';
import { join, basename } from 'path';

interface ImportOptions {
	validateOnly?: boolean;
	skipErrors?: boolean;
	upsert?: boolean;
}

async function importCollection(
	collectionName: string,
	csvPath: string,
	options: ImportOptions = {}
): Promise<void> {
	const db = getDB();

	console.log(`\n📥 Importing ${collectionName} from ${csvPath}...`);

	// Parse CSV
	const parseResult = await parseCSVFile(csvPath);
	if (!parseResult.success) {
		console.error(`✗ CSV parsing failed:`);
		parseResult.errors.forEach((err) => console.error(`  - ${err}`));
		throw new Error('CSV parsing failed');
	}

	console.log(`✓ Parsed ${parseResult.rowCount} rows`);

	// Build reference cache
	const cache = await buildCache(db);

	// Normalize and resolve references
	const resolvedDocs: any[] = [];
	const errors: string[] = [];

	for (let i = 0; i < parseResult.data.length; i++) {
		const row = parseResult.data[i];
		const rowNumber = i + 2; // +2 because header is row 1, data starts at row 2

		// Normalize column names
		const normalized = normalizeCSVRow(row, collectionName);

		// Resolve references
		const resolveResult = resolveReferences(collectionName, normalized, cache);

		if (resolveResult.success && resolveResult.resolved) {
			resolvedDocs.push(resolveResult.resolved);
		} else {
			const errorMsg = `Row ${rowNumber}: ${resolveResult.errors?.join(', ')}`;
			errors.push(errorMsg);

			if (!options.skipErrors) {
				console.error(`✗ ${errorMsg}`);
			}
		}
	}

	// Display errors
	if (errors.length > 0) {
		console.error(`\n⚠️  ${errors.length} rows have errors:`);
		errors.slice(0, 10).forEach((err) => console.error(`  - ${err}`));
		if (errors.length > 10) {
			console.error(`  ... and ${errors.length - 10} more errors`);
		}

		if (!options.skipErrors) {
			throw new Error(`Import failed with ${errors.length} errors`);
		}
	}

	console.log(`✓ Resolved ${resolvedDocs.length} rows`);

	// Validate only mode
	if (options.validateOnly) {
		console.log(`\n✓ Validation complete. No data imported (validate-only mode).`);
		return;
	}

	// Import to database
	if (resolvedDocs.length === 0) {
		console.log(`⚠️  No valid rows to import`);
		return;
	}

	try {
		if (options.upsert) {
			// Upsert mode: Update if exists, insert if new
			console.log(`📝 Upserting documents...`);
			let upserted = 0;

			for (const doc of resolvedDocs) {
				const filter = getUniqueFilter(collectionName, doc);
				await db.collection(collectionName).updateOne(filter, { $set: doc }, { upsert: true });
				upserted++;
			}

			console.log(`✓ Upserted ${upserted} documents`);
		} else {
			// Insert mode
			const result = await db.collection(collectionName).insertMany(resolvedDocs);
			console.log(`✓ Inserted ${result.insertedCount} documents`);
		}

		console.log(`\n✅ Import complete: ${collectionName}`);
	} catch (error) {
		console.error(`✗ Database insert failed:`, error);
		throw error;
	}
}

/**
 * Get unique filter for upsert operations
 */
function getUniqueFilter(collectionName: string, doc: any): any {
	switch (collectionName) {
		case 'identities':
			return doc.email ? { email: doc.email } : { username: doc.username };
		case 'organizations':
			return { code: doc.code };
		case 'org_units':
			return { code: doc.code };
		case 'positions':
			return { code: doc.code };
		case 'oauth_clients':
			return { clientId: doc.clientId };
		case 'scim_clients':
			return { clientId: doc.clientId };
		default:
			return { _id: doc._id };
	}
}

/**
 * Import all CSV files from a directory
 */
async function importFromDirectory(dirPath: string, options: ImportOptions = {}): Promise<void> {
	console.log(`\n📂 Scanning directory: ${dirPath}`);

	const files = readdirSync(dirPath).filter((f) => f.endsWith('.csv'));

	if (files.length === 0) {
		console.log(`⚠️  No CSV files found in ${dirPath}`);
		return;
	}

	console.log(`Found ${files.length} CSV files:\n${files.map((f) => `  - ${f}`).join('\n')}`);

	// Import in dependency order
	const importOrder = [
		'organizations',
		'positions',
		'org_units',
		'oauth_clients',
		'scim_clients',
		'identities',
		'org_structure_versions',
		'sk_penempatan',
		'employee_history',
		'audit_logs'
	];

	let imported = 0;

	for (const collectionName of importOrder) {
		const csvFile = `${collectionName}.csv`;
		if (files.includes(csvFile)) {
			const csvPath = join(dirPath, csvFile);
			try {
				await importCollection(collectionName, csvPath, options);
				imported++;
			} catch (error) {
				console.error(`✗ Failed to import ${collectionName}`);
				if (!options.skipErrors) {
					throw error;
				}
			}
		}
	}

	console.log(`\n✅ Imported ${imported}/${files.length} collections`);
}

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
Database Import Script

Usage:
  bun run scripts/db-import.ts <collection> <csv-file>  # Import specific collection
  bun run scripts/db-import.ts --dir <directory>        # Import all CSV files from directory
  bun run scripts/db-import.ts --validate-only <file>   # Validate without importing

Options:
  --dir <path>         Import all CSV files from directory
  --validate-only      Validate CSV without importing
  --skip-errors        Continue on errors
  --upsert             Update if exists, insert if new

Examples:
  bun run scripts/db-import.ts identities ./scripts/seeders/identities.csv
  bun run scripts/db-import.ts --dir ./scripts/seeders/
  bun run scripts/db-import.ts --validate-only ./data/identities.csv
		`);
		process.exit(0);
	}

	// Parse options
	const options: ImportOptions = {
		validateOnly: args.includes('--validate-only'),
		skipErrors: args.includes('--skip-errors'),
		upsert: args.includes('--upsert')
	};

	// Connect to database
	await connectDB();

	try {
		if (args.includes('--dir')) {
			const dirIndex = args.indexOf('--dir');
			const dirPath = args[dirIndex + 1];

			if (!dirPath) {
				console.error('✗ Missing directory path after --dir');
				process.exit(1);
			}

			await importFromDirectory(dirPath, options);
		} else {
			// Single collection import
			const collectionName = args.find((arg) => !arg.startsWith('--'));
			const csvPath = args.find((arg, idx) => {
				return !arg.startsWith('--') && arg !== collectionName;
			});

			if (!collectionName || !csvPath) {
				console.error('✗ Missing collection name or CSV file path');
				console.error('Usage: bun run scripts/db-import.ts <collection> <csv-file>');
				process.exit(1);
			}

			await importCollection(collectionName, csvPath, options);
		}

		await disconnectDB();
		process.exit(0);
	} catch (error) {
		console.error('\n✗ Import failed:', error);
		await disconnectDB();
		process.exit(1);
	}
}

// Run
main();
