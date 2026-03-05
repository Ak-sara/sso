#!/usr/bin/env bun

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

interface CollectionStats {
	name: string;
	count: number;
	size: number;
	avgObjSize: number;
	storageSize: number;
	indexes: number;
}

interface DatabaseStats {
	database: string;
	collections: CollectionStats[];
	totalDocuments: number;
	totalSize: number;
	totalStorageSize: number;
	totalIndexes: number;
}

async function getCollectionStats(db: any, collectionName: string): Promise<CollectionStats | null> {
	try {
		const stats = await db.command({ collStats: collectionName });
		return {
			name: collectionName,
			count: stats.count || 0,
			size: stats.size || 0,
			avgObjSize: stats.avgObjSize || 0,
			storageSize: stats.storageSize || 0,
			indexes: stats.nindexes || 0
		};
	} catch (error) {
		return null;
	}
}

async function getDatabaseStats(dbName: string): Promise<DatabaseStats> {
	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is required');
	}

	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();
		const db = client.db(dbName);

		const allCollections = await db.listCollections().toArray();
		const collectionNames = allCollections.map(c => c.name);

		// Filter out system collections
		const relevantCollections = collectionNames.filter(name => !name.startsWith('system.'));

		const collectionStats: CollectionStats[] = [];

		for (const collectionName of relevantCollections) {
			const stats = await getCollectionStats(db, collectionName);
			if (stats) {
				collectionStats.push(stats);
			}
		}

		collectionStats.sort((a, b) => b.count - a.count);

		const totalDocuments = collectionStats.reduce((sum, c) => sum + c.count, 0);
		const totalSize = collectionStats.reduce((sum, c) => sum + c.size, 0);
		const totalStorageSize = collectionStats.reduce((sum, c) => sum + c.storageSize, 0);
		const totalIndexes = collectionStats.reduce((sum, c) => sum + c.indexes, 0);

		return {
			database: dbName,
			collections: collectionStats,
			totalDocuments,
			totalSize,
			totalStorageSize,
			totalIndexes
		};

	} finally {
		await client.close();
	}
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatNumber(num: number): string {
	return num.toLocaleString('id-ID');
}

async function printStats(database: string, detailed: boolean = false): Promise<void> {
	console.log(`\n📊 Database Statistics: ${database}\n`);

	const stats = await getDatabaseStats(database);

	console.log(`📈 Summary:`);
	console.log(`   Total Documents: ${formatNumber(stats.totalDocuments)}`);
	console.log(`   Total Data Size: ${formatBytes(stats.totalSize)}`);
	console.log(`   Storage Size: ${formatBytes(stats.totalStorageSize)}`);
	console.log(`   Total Indexes: ${stats.totalIndexes}`);
	console.log(`   Collections: ${stats.collections.length}\n`);

	console.log(`📦 Collections (sorted by document count):\n`);

	const maxNameLength = Math.max(...stats.collections.map(c => c.name.length));

	if (detailed) {
		console.log(`${'Collection'.padEnd(maxNameLength)}  ${'Count'.padStart(10)}  ${'Size'.padStart(12)}  ${'Avg Size'.padStart(10)}  ${'Indexes'.padStart(7)}`);
		console.log('─'.repeat(maxNameLength + 10 + 12 + 10 + 7 + 8));

		for (const collection of stats.collections) {
			const name = collection.name.padEnd(maxNameLength);
			const count = formatNumber(collection.count).padStart(10);
			const size = formatBytes(collection.size).padStart(12);
			const avgSize = formatBytes(collection.avgObjSize).padStart(10);
			const indexes = collection.indexes.toString().padStart(7);

			console.log(`${name}  ${count}  ${size}  ${avgSize}  ${indexes}`);
		}
	} else {
		console.log(`${'Collection'.padEnd(maxNameLength)}  ${'Count'.padStart(10)}  ${'Size'.padStart(12)}`);
		console.log('─'.repeat(maxNameLength + 10 + 12 + 4));

		for (const collection of stats.collections) {
			const name = collection.name.padEnd(maxNameLength);
			const count = formatNumber(collection.count).padStart(10);
			const size = formatBytes(collection.size).padStart(12);

			console.log(`${name}  ${count}  ${size}`);
		}
	}

	console.log();
}

async function compareStats(database1: string, database2: string): Promise<void> {
	console.log(`\n🔍 Database Comparison\n`);
	console.log(`   Database 1: ${database1}`);
	console.log(`   Database 2: ${database2}\n`);

	const [stats1, stats2] = await Promise.all([
		getDatabaseStats(database1),
		getDatabaseStats(database2)
	]);

	const allCollections = new Set([
		...stats1.collections.map(c => c.name),
		...stats2.collections.map(c => c.name)
	]);

	const maxNameLength = Math.max(...Array.from(allCollections).map(n => n.length));

	console.log(`${'Collection'.padEnd(maxNameLength)}  ${'DB1 Count'.padStart(12)}  ${'DB2 Count'.padStart(12)}  ${'Difference'.padStart(12)}`);
	console.log('─'.repeat(maxNameLength + 12 + 12 + 12 + 6));

	for (const collectionName of Array.from(allCollections).sort()) {
		const col1 = stats1.collections.find(c => c.name === collectionName);
		const col2 = stats2.collections.find(c => c.name === collectionName);

		const count1 = col1 ? col1.count : 0;
		const count2 = col2 ? col2.count : 0;
		const diff = count2 - count1;

		const name = collectionName.padEnd(maxNameLength);
		const c1 = formatNumber(count1).padStart(12);
		const c2 = formatNumber(count2).padStart(12);
		const diffStr = (diff > 0 ? '+' : '') + formatNumber(diff).padStart(11);

		const diffColor = diff === 0 ? '' : diff > 0 ? '🟢' : '🔴';
		console.log(`${name}  ${c1}  ${c2}  ${diffStr} ${diffColor}`);
	}

	console.log('\n📊 Summary:');
	console.log(`   DB1 Total Documents: ${formatNumber(stats1.totalDocuments)}`);
	console.log(`   DB2 Total Documents: ${formatNumber(stats2.totalDocuments)}`);
	const totalDiff = stats2.totalDocuments - stats1.totalDocuments;
	console.log(`   Difference: ${totalDiff > 0 ? '+' : ''}${formatNumber(totalDiff)} ${totalDiff > 0 ? '🟢' : totalDiff < 0 ? '🔴' : ''}`);
	console.log();
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
	console.log(`
Database Statistics Tool

Usage:
  bun run scripts/db-stats.ts <database> [options]
  bun run scripts/db-stats.ts compare <database1> <database2>

Arguments:
  database    Database name (any MongoDB database)

Options:
  --detailed  Show detailed statistics (indexes, avg object size)

Commands:
  compare <db1> <db2>
    Compare document counts between two databases

Examples:
  # Show basic stats
  bun run scripts/db-stats.ts aksara_sso

  # Show detailed stats
  bun run scripts/db-stats.ts aksara_sso --detailed

  # Compare two databases
  bun run scripts/db-stats.ts compare aksara_sso dev_sso

Use cases:
  # Check if seeding completed successfully
  bun run scripts/db-stats.ts aksara_sso

  # Verify clone operation
  bun run scripts/db-stats.ts compare aksara_sso dev_sso

  # Monitor database growth
  bun run scripts/db-stats.ts aksara_sso --detailed
`);
	process.exit(0);
}

if (args[0] === 'compare') {
	const db1 = args[1];
	const db2 = args[2];

	if (!db1 || !db2) {
		console.error('❌ Usage: bun run scripts/db-stats.ts compare <database1> <database2>');
		process.exit(1);
	}

	compareStats(db1, db2)
		.then(() => process.exit(0))
		.catch((err) => {
			console.error('❌ Error:', err);
			process.exit(1);
		});
} else {
	const database = args[0];
	const detailed = args.includes('--detailed');

	if (!database) {
		console.error(`❌ Database name is required`);
		console.error(`Usage: bun run scripts/db-stats.ts <database>`);
		process.exit(1);
	}

	printStats(database, detailed)
		.then(() => process.exit(0))
		.catch((err) => {
			console.error('❌ Error:', err);
			process.exit(1);
		});
}
