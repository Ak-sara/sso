#!/usr/bin/env bun

/**
 * Database Seeding Script
 *
 * Seeds MongoDB database from CSV files in dependency order.
 * Replaces old src/lib/db/seeders/index.ts with CSV-based approach.
 *
 * Usage:
 *   bun run scripts/db-seed.ts                     # Seed from ./scripts/seeders/
 *   bun run scripts/db-seed.ts --clean             # Drop collections first
 *   bun run scripts/db-seed.ts --dir ./data/       # Seed from custom directory
 */

import { connectDB, disconnectDB, getDB } from '../src/lib/db/connection';
import { parseCSVFile, normalizeCSVRow } from '../src/lib/utils/csv-parser';
import { buildCache, resolveReferences } from '../src/lib/utils/reference-resolver';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const DEFAULT_SEEDERS_DIR = './scripts/seeders';

// Collection import order (respects dependencies)
const IMPORT_ORDER = [
	'organizations', // No dependencies
	'positions', // No dependencies
	'org_units', // Depends on: organizations, parentId (self)
	'oauth_clients', // No dependencies
	'scim_clients', // No dependencies
	'identities', // Depends on: organizations, org_units, positions, managerId (self)
	'entraid_configs', // Depends on: organizations
	'org_structure_versions', // Depends on: organizations, org_units
	'sk_penempatan', // Depends on: organizations, identities
	'employee_history', // Depends on: identities
	'audit_log', // Depends on: identities (note: singular, not plural)
	'audit_logs' // Depends on: identities (if plural version exists)
];

interface SeedOptions {
	clean?: boolean;
	seedersDir?: string;
}

async function dropCollectionsWithCSV(csvFiles: string[]): Promise<void> {
	const db = getDB();

	// Extract collection names from CSV files (remove .csv extension)
	const collectionsToDrop = csvFiles.map(f => f.replace('.csv', ''));

	console.log('🗑️  Dropping collections that have CSV files...');
	console.log(`   Will drop: ${collectionsToDrop.join(', ')}\n`);

	let dropped = 0;

	for (const collectionName of collectionsToDrop) {
		try {
			await db.collection(collectionName).drop();
			console.log(`  ✓ Dropped ${collectionName}`);
			dropped++;
		} catch (error: any) {
			if (error.codeName === 'NamespaceNotFound') {
				console.log(`  ⏭️  ${collectionName} does not exist (skip)`);
			} else {
				throw error;
			}
		}
	}

	console.log(`✓ Dropped ${dropped} collections\n`);
}

async function seedCollection(
	collectionName: string,
	csvPath: string
): Promise<{ inserted: number; skipped: number }> {
	const db = getDB();

	console.log(`\n📥 Seeding ${collectionName}...`);

	// Parse CSV
	const parseResult = await parseCSVFile(csvPath);
	if (!parseResult.success) {
		console.error(`✗ CSV parsing failed:`);
		parseResult.errors.forEach((err) => console.error(`  - ${err}`));
		throw new Error(`Failed to parse ${csvPath}`);
	}

	console.log(`  ✓ Parsed ${parseResult.rowCount} rows`);

	if (parseResult.rowCount === 0) {
		console.log(`  ⚠️  No data to import`);
		return { inserted: 0, skipped: 0 };
	}

	// Build reference cache
	const cache = await buildCache(db);

	// Normalize and resolve references
	const resolvedDocs: any[] = [];
	const errors: string[] = [];

	for (let i = 0; i < parseResult.data.length; i++) {
		const row = parseResult.data[i];
		const rowNumber = i + 2;

		// Normalize column names
		const normalized = normalizeCSVRow(row, collectionName);

		// Resolve references
		const resolveResult = resolveReferences(collectionName, normalized, cache);

		if (resolveResult.success && resolveResult.resolved) {
			resolvedDocs.push(resolveResult.resolved);
		} else {
			const errorMsg = `Row ${rowNumber}: ${resolveResult.errors?.join(', ')}`;
			errors.push(errorMsg);
		}
	}

	// Display errors
	if (errors.length > 0) {
		console.error(`  ⚠️  ${errors.length} rows have errors:`);
		errors.slice(0, 5).forEach((err) => console.error(`    - ${err}`));
		if (errors.length > 5) {
			console.error(`    ... and ${errors.length - 5} more errors`);
		}
	}

	console.log(`  ✓ Resolved ${resolvedDocs.length}/${parseResult.rowCount} rows`);

	// Insert to database
	if (resolvedDocs.length === 0) {
		return { inserted: 0, skipped: parseResult.rowCount };
	}

	try {
		const result = await db.collection(collectionName).insertMany(resolvedDocs, { ordered: false });
		console.log(`  ✅ Inserted ${result.insertedCount} documents into ${collectionName}`);
		return { inserted: result.insertedCount, skipped: errors.length };
	} catch (error: any) {
		// Handle duplicate key errors gracefully
		if (error.code === 11000) {
			console.log(`  ⚠️  Some documents already exist (duplicate keys)`);
			const inserted = error.result?.nInserted || 0;
			return { inserted, skipped: resolvedDocs.length - inserted };
		}
		throw error;
	}
}

async function seedFromDirectory(seedersDir: string, options: SeedOptions = {}): Promise<void> {
	console.log(`\n🌱 Seeding database from: ${seedersDir}\n`);

	// Check directory exists
	if (!existsSync(seedersDir)) {
		console.error(`✗ Directory not found: ${seedersDir}`);
		console.error(`  Please create the directory and add CSV files.`);
		process.exit(1);
	}

	// Connect to database
	await connectDB();

	// Find CSV files
	const availableFiles = readdirSync(seedersDir).filter((f) => f.endsWith('.csv'));

	if (availableFiles.length === 0) {
		console.error(`✗ No CSV files found in ${seedersDir}`);
		console.error(`  Expected files like: identities.csv, organizations.csv, etc.`);
		process.exit(1);
	}

	console.log(`📂 Found ${availableFiles.length} CSV files`);

	// Clean database if requested (only drop collections that have CSV files)
	if (options.clean) {
		await dropCollectionsWithCSV(availableFiles);
	}

	// Seed collections in dependency order
	let totalInserted = 0;
	let totalSkipped = 0;
	let seededCount = 0;

	for (const collectionName of IMPORT_ORDER) {
		const csvFile = `${collectionName}.csv`;

		if (!availableFiles.includes(csvFile)) {
			console.log(`  ⏭️  Skipping ${collectionName} (no CSV file)`);
			continue;
		}

		const csvPath = join(seedersDir, csvFile);

		try {
			const result = await seedCollection(collectionName, csvPath);
			totalInserted += result.inserted;
			totalSkipped += result.skipped;
			seededCount++;
		} catch (error) {
			console.error(`\n✗ Failed to seed ${collectionName}:`, error);
			throw error;
		}
	}

	// Summary
	console.log(`\n${'='.repeat(60)}`);
	console.log(`✅ Seeding complete!`);
	console.log(`${'='.repeat(60)}`);
	console.log(`  Collections seeded: ${seededCount}`);
	console.log(`  Documents inserted: ${totalInserted}`);
	if (totalSkipped > 0) {
		console.log(`  Rows skipped: ${totalSkipped}`);
	}
	console.log(`${'='.repeat(60)}\n`);
}

async function main() {
	const args = process.argv.slice(2);

	// Parse arguments
	const options: SeedOptions = {
		clean: args.includes('--clean'),
		seedersDir: DEFAULT_SEEDERS_DIR
	};

	if (args.includes('--dir')) {
		const dirIndex = args.indexOf('--dir');
		options.seedersDir = args[dirIndex + 1];
	}

	// Show help
	if (args.includes('--help') || args.includes('-h')) {
		console.log(`
Database Seeding Script

Seeds MongoDB database from CSV files in dependency order.

Usage:
  bun run scripts/db-seed.ts                  # Seed from ./scripts/seeders/
  bun run scripts/db-seed.ts --clean          # Drop collections first
  bun run scripts/db-seed.ts --dir ./data/    # Seed from custom directory

Options:
  --clean              Drop all collections before seeding
  --dir <path>         Seed from custom directory (default: ./scripts/seeders/)
  --help, -h           Show this help message

Collection Import Order (respects dependencies):
  1. organizations     (no dependencies)
  2. positions         (no dependencies)
  3. org_units         (depends on: organizations)
  4. oauth_clients     (no dependencies)
  5. scim_clients      (no dependencies)
  6. identities        (depends on: organizations, org_units, positions)
  7. org_structure_versions
  8. sk_penempatan
  9. employee_history
  10. audit_logs

Expected CSV Files:
  ${IMPORT_ORDER.map((name) => `${name}.csv`).join('\n  ')}
		`);
		process.exit(0);
	}

	try {
		await seedFromDirectory(options.seedersDir!, options);
		await disconnectDB();
		process.exit(0);
	} catch (error) {
		console.error('\n✗ Seeding failed:', error);
		await disconnectDB();
		process.exit(1);
	}
}

// Run
main();
