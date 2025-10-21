import { MongoClient } from 'mongodb';
import { CLONE_INCLUDED_COLLECTIONS, CLONE_EXCLUDED_COLLECTIONS, DB_TARGETS } from '../src/lib/db/seeders/config';

const MONGODB_URI = process.env.MONGODB_URI || '';

interface CloneOptions {
	source: keyof typeof DB_TARGETS;
	target: keyof typeof DB_TARGETS;
	dryRun?: boolean;
	clearTarget?: boolean;
}

async function cloneDatabase(options: CloneOptions): Promise<void> {
	const { source, target, dryRun = false, clearTarget = false } = options;

	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is required');
	}

	if (source === target) {
		throw new Error('Source and target databases cannot be the same');
	}

	const sourceDBName = DB_TARGETS[source];
	const targetDBName = DB_TARGETS[target];

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
			if (CLONE_EXCLUDED_COLLECTIONS.includes(name)) {
				console.log(`⏭️  Skipping ${name} (excluded collection)`);
				return false;
			}
			if (!CLONE_INCLUDED_COLLECTIONS.includes(name)) {
				console.log(`⏭️  Skipping ${name} (not in included list)`);
				return false;
			}
			return true;
		});

		console.log(`\n📋 Collections to clone: ${collectionsToClone.length}`);
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

if (args.length === 0 || args.includes('--help')) {
	console.log(`
Database Clone Tool

Usage:
  bun run db:clone <source> <target> [options]

Arguments:
  source    Source database (dev | uat | test)
  target    Target database (dev | uat | test)

Options:
  --dry-run       Preview what will be cloned without making changes
  --clear-target  Delete all documents in target collections before cloning

Examples:
  bun run db:clone dev uat
  bun run db:clone dev uat --clear-target
  bun run db:clone dev test --dry-run

Common workflows:
  # Clone dev → uat (append mode)
  bun run db:clone dev uat

  # Clone dev → uat (replace mode)
  bun run db:clone dev uat --clear-target

  # Preview clone without changes
  bun run db:clone dev uat --dry-run
`);
	process.exit(0);
}

const source = args[0] as keyof typeof DB_TARGETS;
const target = args[1] as keyof typeof DB_TARGETS;
const dryRun = args.includes('--dry-run');
const clearTarget = args.includes('--clear-target');

if (!DB_TARGETS[source]) {
	console.error(`❌ Invalid source database: ${source}`);
	console.error(`   Valid options: dev, uat, test`);
	process.exit(1);
}

if (!DB_TARGETS[target]) {
	console.error(`❌ Invalid target database: ${target}`);
	console.error(`   Valid options: dev, uat, test`);
	process.exit(1);
}

cloneDatabase({ source, target, dryRun, clearTarget })
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
