#!/usr/bin/env bun

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

// Default collections to exclude from cloning
const DEFAULT_EXCLUDED_COLLECTIONS = ['system.indexes', 'system.users', 'system.profile'];

// Define collection dependencies for proper cloning order
// Collections are cloned in this order to respect foreign key relationships
const COLLECTION_ORDER = [
	// 1. Base collections (no dependencies)
	'organizations',
	'positions',

	// 2. Collections that depend on base collections
	'org_units',                    // depends on: organizations
	'oauth_clients',                // depends on: organizations
	'scim_clients',                 // depends on: organizations
	'entraid_configs',              // depends on: organizations

	// 3. Collections that depend on org structure
	'identities',                   // depends on: organizations, org_units, positions
	'org_structure_versions',       // depends on: organizations, org_units
	'sk_penempatan',                // depends on: organizations, org_units, positions, identities
	'employee_history',             // depends on: identities, org_units, positions

	// 4. Transient/session data (no referential integrity concerns)
	'auth_codes',
	'refresh_tokens',
	'sessions',
	'scim_access_tokens',

	// 5. Audit logs (depend on everything)
	'audit_log',
	'scim_audit_logs'
];

interface CloneOptions {
	source: string;
	target: string;
	dryRun?: boolean;
	clearTarget?: boolean;
	excludeCollections?: string[];
	includeCollections?: string[];
}

async function cloneDatabase(options: CloneOptions): Promise<void> {
	const {
		source,
		target,
		dryRun = false,
		clearTarget = false,
		excludeCollections = DEFAULT_EXCLUDED_COLLECTIONS,
		includeCollections = []
	} = options;

	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is required');
	}

	if (source === target) {
		throw new Error('Source and target databases cannot be the same');
	}

	const sourceDBName = source;
	const targetDBName = target;

	console.log(`\n🔄 Database Clone Tool`);
	console.log(`   Source: ${sourceDBName}`);
	console.log(`   Target: ${targetDBName}`);
	console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
	console.log(`   Clear target first: ${clearTarget ? 'YES' : 'NO'}`);
	console.log();

	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();
		console.log('✅ Connected to MongoDB Atlas\n');

		const sourceDB = client.db(sourceDBName);
		const targetDB = client.db(targetDBName);

		const sourceCollections = await sourceDB.listCollections().toArray();
		const existingCollections = sourceCollections.map(c => c.name);

		const collectionsToClone = existingCollections.filter(name => {
			// Skip system collections
			if (excludeCollections.includes(name) || name.startsWith('system.')) {
				console.log(`⏭️  Skipping ${name} (excluded collection)`);
				return false;
			}
			// If includeCollections is specified, only clone those
			if (includeCollections.length > 0 && !includeCollections.includes(name)) {
				console.log(`⏭️  Skipping ${name} (not in included list)`);
				return false;
			}
			return true;
		});

		// Sort collections by dependency order
		collectionsToClone.sort((a, b) => {
			const indexA = COLLECTION_ORDER.indexOf(a);
			const indexB = COLLECTION_ORDER.indexOf(b);

			// If both in COLLECTION_ORDER, sort by their position
			if (indexA !== -1 && indexB !== -1) {
				return indexA - indexB;
			}
			// If only A is in COLLECTION_ORDER, A comes first
			if (indexA !== -1) return -1;
			// If only B is in COLLECTION_ORDER, B comes first
			if (indexB !== -1) return 1;
			// If neither in COLLECTION_ORDER, keep original order
			return 0;
		});

		console.log(`\n📋 Collections to clone (in dependency order): ${collectionsToClone.length}`);
		collectionsToClone.forEach(name => console.log(`   - ${name}`));
		console.log();

		if (dryRun) {
			console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
			return;
		}

		if (clearTarget) {
			console.log('🗑️  Clearing target database collections...');
			for (const collectionName of collectionsToClone) {
				try {
					await targetDB.collection(collectionName).deleteMany({});
					const count = await targetDB.collection(collectionName).countDocuments();
					console.log(`   Cleared ${collectionName} (${count} docs remaining)`);
				} catch (err) {
					console.log(`   Collection ${collectionName} does not exist in target (ok)`);
				}
			}
			console.log();
		}

		const startTime = Date.now();
		let totalDocuments = 0;

		for (const collectionName of collectionsToClone) {
			const sourceCollection = sourceDB.collection(collectionName);
			const targetCollection = targetDB.collection(collectionName);

			const docCount = await sourceCollection.countDocuments();
			console.log(`📦 Cloning ${collectionName} (${docCount} documents)...`);

			if (docCount === 0) {
				console.log(`   ⚠️  No documents to clone\n`);
				continue;
			}

			const batchSize = 1000;
			let processedCount = 0;

			const cursor = sourceCollection.find({});

			let batch = [];
			for await (const doc of cursor) {
				batch.push(doc);
				processedCount++;

				if (batch.length >= batchSize) {
					await targetCollection.insertMany(batch, { ordered: false });
					batch = [];
					const progress = Math.round((processedCount / docCount) * 100);
					process.stdout.write(`\r   Progress: ${processedCount}/${docCount} (${progress}%)`);
				}
			}

			if (batch.length > 0) {
				await targetCollection.insertMany(batch, { ordered: false });
			}

			totalDocuments += docCount;
			console.log(`\r   ✅ Completed: ${docCount}/${docCount} (100%)\n`);
		}

		const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`\n🎉 Clone completed successfully!`);
		console.log(`   Total documents: ${totalDocuments}`);
		console.log(`   Total time: ${elapsed}s`);
		console.log(`   Speed: ${Math.round(totalDocuments / parseFloat(elapsed))} docs/sec\n`);

	} catch (error) {
		console.error('❌ Clone failed:', error);
		throw error;
	} finally {
		await client.close();
		console.log('🔌 Disconnected from MongoDB Atlas');
	}
}

const args = process.argv.slice(2);

if (args.length < 2 || args.includes('--help')) {
	console.log(`
Database Clone Tool

Usage:
  bun run scripts/db-clone.ts <source> <target> [options]

Arguments:
  source    Source database name (any MongoDB database)
  target    Target database name (any MongoDB database)

Options:
  --dry-run       Preview what will be cloned without making changes
  --clear-target  Delete all documents in target collections before cloning

Examples:
  bun run scripts/db-clone.ts aksara_sso dev_sso
  bun run scripts/db-clone.ts aksara_sso dev_sso --clear-target
  bun run scripts/db-clone.ts prod_db backup_db --dry-run

Common workflows:
  # Clone production → backup (append mode)
  bun run scripts/db-clone.ts aksara_sso aksara_sso_backup

  # Clone production → dev (replace mode)
  bun run scripts/db-clone.ts aksara_sso dev_sso --clear-target

  # Preview clone without changes
  bun run scripts/db-clone.ts aksara_sso dev_sso --dry-run
`);
	process.exit(0);
}

const source = args[0];
const target = args[1];
const dryRun = args.includes('--dry-run');
const clearTarget = args.includes('--clear-target');

if (!source || !target) {
	console.error(`❌ Both source and target database names are required`);
	console.error(`Usage: bun run scripts/db-clone.ts <source> <target>`);
	process.exit(1);
}

cloneDatabase({ source, target, dryRun, clearTarget })
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
