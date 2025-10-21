import { MongoClient } from 'mongodb';
import { CLONE_INCLUDED_COLLECTIONS, DB_TARGETS } from '../src/lib/db/seeders/config';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const MONGODB_URI = process.env.MONGODB_URI || '';
const SNAPSHOTS_DIR = join(process.cwd(), '.snapshots');

interface SnapshotMetadata {
	name: string;
	database: string;
	timestamp: string;
	collections: string[];
	totalDocuments: number;
	description?: string;
}

async function ensureSnapshotsDir(): Promise<void> {
	if (!existsSync(SNAPSHOTS_DIR)) {
		await mkdir(SNAPSHOTS_DIR, { recursive: true });
		console.log(`📁 Created snapshots directory: ${SNAPSHOTS_DIR}`);
	}
}

async function createSnapshot(database: keyof typeof DB_TARGETS, name: string, description?: string): Promise<void> {
	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is required');
	}

	const dbName = DB_TARGETS[database];
	const timestamp = new Date().toISOString();
	const snapshotName = `${name}_${timestamp.split('T')[0]}_${Date.now()}`;

	console.log(`\n📸 Creating snapshot: ${snapshotName}`);
	console.log(`   Database: ${dbName}`);
	console.log(`   Time: ${new Date(timestamp).toLocaleString('id-ID')}\n`);

	await ensureSnapshotsDir();

	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();
		const db = client.db(dbName);

		const allCollections = await db.listCollections().toArray();
		const collectionsToSnapshot = allCollections
			.map(c => c.name)
			.filter(name => CLONE_INCLUDED_COLLECTIONS.includes(name));

		console.log(`📋 Collections to snapshot: ${collectionsToSnapshot.length}`);
		collectionsToSnapshot.forEach(name => console.log(`   - ${name}`));
		console.log();

		const snapshotData: Record<string, any[]> = {};
		let totalDocuments = 0;

		for (const collectionName of collectionsToSnapshot) {
			const collection = db.collection(collectionName);
			const documents = await collection.find({}).toArray();

			snapshotData[collectionName] = documents;
			totalDocuments += documents.length;

			console.log(`✅ Captured ${collectionName}: ${documents.length} documents`);
		}

		const metadata: SnapshotMetadata = {
			name: snapshotName,
			database: dbName,
			timestamp,
			collections: collectionsToSnapshot,
			totalDocuments,
			description
		};

		const snapshotPath = join(SNAPSHOTS_DIR, `${snapshotName}.json`);
		const snapshotContent = {
			metadata,
			data: snapshotData
		};

		await writeFile(snapshotPath, JSON.stringify(snapshotContent, null, 2));

		const fileSize = (JSON.stringify(snapshotContent).length / (1024 * 1024)).toFixed(2);

		console.log(`\n🎉 Snapshot created successfully!`);
		console.log(`   Path: ${snapshotPath}`);
		console.log(`   Size: ${fileSize} MB`);
		console.log(`   Documents: ${totalDocuments}\n`);

	} catch (error) {
		console.error('❌ Snapshot creation failed:', error);
		throw error;
	} finally {
		await client.close();
	}
}

async function restoreSnapshot(snapshotName: string, targetDatabase: keyof typeof DB_TARGETS, clearTarget: boolean = false): Promise<void> {
	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is required');
	}

	const snapshotFiles = await readdir(SNAPSHOTS_DIR);
	const matchingFile = snapshotFiles.find(f => f.startsWith(snapshotName) && f.endsWith('.json'));

	if (!matchingFile) {
		throw new Error(`Snapshot not found: ${snapshotName}`);
	}

	const snapshotPath = join(SNAPSHOTS_DIR, matchingFile);
	console.log(`\n📦 Restoring snapshot: ${matchingFile}`);

	const snapshotContent = JSON.parse(await readFile(snapshotPath, 'utf-8'));
	const { metadata, data } = snapshotContent;

	console.log(`   Source: ${metadata.database}`);
	console.log(`   Target: ${DB_TARGETS[targetDatabase]}`);
	console.log(`   Created: ${new Date(metadata.timestamp).toLocaleString('id-ID')}`);
	console.log(`   Documents: ${metadata.totalDocuments}\n`);

	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();
		const db = client.db(DB_TARGETS[targetDatabase]);

		if (clearTarget) {
			console.log('🗑️  Clearing target collections...');
			for (const collectionName of metadata.collections) {
				await db.collection(collectionName).deleteMany({});
				console.log(`   Cleared ${collectionName}`);
			}
			console.log();
		}

		let totalRestored = 0;

		for (const collectionName of metadata.collections) {
			const documents = data[collectionName] || [];

			if (documents.length > 0) {
				await db.collection(collectionName).insertMany(documents, { ordered: false });
				totalRestored += documents.length;
				console.log(`✅ Restored ${collectionName}: ${documents.length} documents`);
			}
		}

		console.log(`\n🎉 Snapshot restored successfully!`);
		console.log(`   Total documents restored: ${totalRestored}\n`);

	} catch (error) {
		console.error('❌ Snapshot restore failed:', error);
		throw error;
	} finally {
		await client.close();
	}
}

async function readdir(path: string): Promise<string[]> {
	const { readdir: readdirFS } = await import('fs/promises');
	if (!existsSync(path)) {
		return [];
	}
	return readdirFS(path);
}

async function listSnapshots(): Promise<void> {
	await ensureSnapshotsDir();

	const files = await readdir(SNAPSHOTS_DIR);
	const snapshotFiles = files.filter(f => f.endsWith('.json'));

	if (snapshotFiles.length === 0) {
		console.log('\n📭 No snapshots found\n');
		return;
	}

	console.log(`\n📸 Available snapshots (${snapshotFiles.length}):\n`);

	for (const file of snapshotFiles.sort().reverse()) {
		const content = JSON.parse(await readFile(join(SNAPSHOTS_DIR, file), 'utf-8'));
		const { metadata } = content;

		console.log(`📦 ${metadata.name}`);
		console.log(`   Database: ${metadata.database}`);
		console.log(`   Created: ${new Date(metadata.timestamp).toLocaleString('id-ID')}`);
		console.log(`   Documents: ${metadata.totalDocuments}`);
		console.log(`   Collections: ${metadata.collections.length}`);
		if (metadata.description) {
			console.log(`   Description: ${metadata.description}`);
		}
		console.log();
	}
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help') {
	console.log(`
Database Snapshot Manager

Commands:
  create <database> <name> [description]
    Create a new snapshot of the specified database
    Examples:
      bun run db:snapshot create dev before-migration
      bun run db:snapshot create uat stable-v1 "Before SCIM changes"

  restore <snapshot-name> <target-database> [--clear-target]
    Restore a snapshot to target database
    Examples:
      bun run db:snapshot restore before-migration dev
      bun run db:snapshot restore stable-v1 uat --clear-target

  list
    List all available snapshots
    Example:
      bun run db:snapshot list

Arguments:
  database    Database to snapshot (dev | uat | test)
  name        Snapshot identifier (e.g., before-migration, stable-v1)
  description Optional description (use quotes)

Options:
  --clear-target  Clear target collections before restoring

Use cases:
  # Before major changes
  bun run db:snapshot create dev before-scim-refactor

  # Before UAT deployment
  bun run db:snapshot create dev pre-uat-deploy

  # Rollback after bad deployment
  bun run db:snapshot restore pre-uat-deploy uat --clear-target

  # Save known-good state
  bun run db:snapshot create uat working-state "All tests passing"
`);
	process.exit(0);
}

switch (command) {
	case 'create': {
		const database = args[1] as keyof typeof DB_TARGETS;
		const name = args[2];
		const description = args[3];

		if (!database || !name) {
			console.error('❌ Usage: bun run db:snapshot create <database> <name> [description]');
			process.exit(1);
		}

		if (!DB_TARGETS[database]) {
			console.error(`❌ Invalid database: ${database}`);
			console.error(`   Valid options: dev, uat, test`);
			process.exit(1);
		}

		createSnapshot(database, name, description)
			.then(() => process.exit(0))
			.catch((err) => {
				console.error(err);
				process.exit(1);
			});
		break;
	}

	case 'restore': {
		const snapshotName = args[1];
		const targetDatabase = args[2] as keyof typeof DB_TARGETS;
		const clearTarget = args.includes('--clear-target');

		if (!snapshotName || !targetDatabase) {
			console.error('❌ Usage: bun run db:snapshot restore <snapshot-name> <target-database> [--clear-target]');
			process.exit(1);
		}

		if (!DB_TARGETS[targetDatabase]) {
			console.error(`❌ Invalid target database: ${targetDatabase}`);
			console.error(`   Valid options: dev, uat, test`);
			process.exit(1);
		}

		restoreSnapshot(snapshotName, targetDatabase, clearTarget)
			.then(() => process.exit(0))
			.catch((err) => {
				console.error(err);
				process.exit(1);
			});
		break;
	}

	case 'list': {
		listSnapshots()
			.then(() => process.exit(0))
			.catch((err) => {
				console.error(err);
				process.exit(1);
			});
		break;
	}

	default:
		console.error(`❌ Unknown command: ${command}`);
		console.error(`   Run with --help for usage information`);
		process.exit(1);
}
