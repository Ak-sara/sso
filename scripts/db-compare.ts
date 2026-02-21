import { MongoClient, ObjectId } from 'mongodb';
import { CLONE_INCLUDED_COLLECTIONS, DB_TARGETS } from '../src/lib/db/seeders/config';

const MONGODB_URI = process.env.MONGODB_URI || '';

interface DocumentDifference {
	_id: string;
	status: 'added' | 'removed' | 'modified';
	fieldChanges?: { field: string; db1Value: any; db2Value: any }[];
}

interface CollectionComparison {
	name: string;
	db1Count: number;
	db2Count: number;
	onlyInDb1: number;
	onlyInDb2: number;
	modified: number;
	identical: number;
	differences: DocumentDifference[];
}

function serializeValue(value: any): string {
	if (value instanceof ObjectId) {
		return value.toString();
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === 'object' && value !== null) {
		return JSON.stringify(value);
	}
	return String(value);
}

function compareDocuments(doc1: any, doc2: any, ignoreFields: string[] = ['_id']): { field: string; db1Value: any; db2Value: any }[] {
	const changes: { field: string; db1Value: any; db2Value: any }[] = [];

	const allKeys = new Set([...Object.keys(doc1), ...Object.keys(doc2)]);

	for (const key of allKeys) {
		if (ignoreFields.includes(key)) continue;

		const val1 = serializeValue(doc1[key]);
		const val2 = serializeValue(doc2[key]);

		if (val1 !== val2) {
			changes.push({
				field: key,
				db1Value: doc1[key],
				db2Value: doc2[key]
			});
		}
	}

	return changes;
}

async function compareCollection(
	db1: any,
	db2: any,
	collectionName: string,
	sampleSize?: number
): Promise<CollectionComparison> {
	const col1 = db1.collection(collectionName);
	const col2 = db2.collection(collectionName);

	const [docs1, docs2] = await Promise.all([
		col1.find({}).limit(sampleSize || 0).toArray(),
		col2.find({}).limit(sampleSize || 0).toArray()
	]);

	const map1 = new Map(docs1.map(d => [d._id.toString(), d]));
	const map2 = new Map(docs2.map(d => [d._id.toString(), d]));

	const differences: DocumentDifference[] = [];
	let identical = 0;

	for (const [id, doc1] of map1) {
		const doc2 = map2.get(id);

		if (!doc2) {
			differences.push({
				_id: id,
				status: 'removed'
			});
		} else {
			const fieldChanges = compareDocuments(doc1, doc2);
			if (fieldChanges.length > 0) {
				differences.push({
					_id: id,
					status: 'modified',
					fieldChanges
				});
			} else {
				identical++;
			}
		}
	}

	for (const [id, doc2] of map2) {
		if (!map1.has(id)) {
			differences.push({
				_id: id,
				status: 'added'
			});
		}
	}

	const onlyInDb1 = differences.filter(d => d.status === 'removed').length;
	const onlyInDb2 = differences.filter(d => d.status === 'added').length;
	const modified = differences.filter(d => d.status === 'modified').length;

	return {
		name: collectionName,
		db1Count: docs1.length,
		db2Count: docs2.length,
		onlyInDb1,
		onlyInDb2,
		modified,
		identical,
		differences
	};
}

async function compareDatabases(
	database1: keyof typeof DB_TARGETS,
	database2: keyof typeof DB_TARGETS,
	options: { sampleSize?: number; showDetails?: boolean } = {}
): Promise<void> {
	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is required');
	}

	const { sampleSize, showDetails = false } = options;

	const dbName1 = DB_TARGETS[database1];
	const dbName2 = DB_TARGETS[database2];

	console.log(`\n🔍 Database Deep Comparison\n`);
	console.log(`   Database 1: ${dbName1}`);
	console.log(`   Database 2: ${dbName2}`);
	if (sampleSize) {
		console.log(`   Sample size: ${sampleSize} documents per collection`);
	}
	console.log();

	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();

		const db1 = client.db(dbName1);
		const db2 = client.db(dbName2);

		const allCollections1 = await db1.listCollections().toArray();
		const relevantCollections = allCollections1
			.map(c => c.name)
			.filter(name => CLONE_INCLUDED_COLLECTIONS.includes(name));

		console.log(`📦 Comparing ${relevantCollections.length} collections...\n`);

		const comparisons: CollectionComparison[] = [];

		for (const collectionName of relevantCollections) {
			process.stdout.write(`⏳ Comparing ${collectionName}...`);

			const comparison = await compareCollection(db1, db2, collectionName, sampleSize);
			comparisons.push(comparison);

			const hasDifferences = comparison.onlyInDb1 + comparison.onlyInDb2 + comparison.modified > 0;
			const status = hasDifferences ? '❌ DIFFERS' : '✅ IDENTICAL';

			process.stdout.write(`\r${status} ${collectionName}\n`);
		}

		console.log();

		const maxNameLength = Math.max(...comparisons.map(c => c.name.length));

		console.log(`📊 Comparison Summary:\n`);
		console.log(
			`${'Collection'.padEnd(maxNameLength)}  ${'DB1'.padStart(6)}  ${'DB2'.padStart(6)}  ${'Only DB1'.padStart(10)}  ${'Only DB2'.padStart(10)}  ${'Modified'.padStart(10)}  ${'Same'.padStart(8)}`
		);
		console.log('─'.repeat(maxNameLength + 6 + 6 + 10 + 10 + 10 + 8 + 10));

		for (const comp of comparisons) {
			const hasDiff = comp.onlyInDb1 + comp.onlyInDb2 + comp.modified > 0;
			const marker = hasDiff ? '⚠️ ' : '✅ ';

			console.log(
				`${marker}${comp.name.padEnd(maxNameLength - 3)}  ${comp.db1Count.toString().padStart(6)}  ${comp.db2Count.toString().padStart(6)}  ${comp.onlyInDb1.toString().padStart(10)}  ${comp.onlyInDb2.toString().padStart(10)}  ${comp.modified.toString().padStart(10)}  ${comp.identical.toString().padStart(8)}`
			);
		}

		console.log();

		if (showDetails) {
			console.log(`📝 Detailed Differences:\n`);

			for (const comp of comparisons) {
				if (comp.differences.length === 0) continue;

				console.log(`\n📦 ${comp.name} (${comp.differences.length} differences):`);

				const added = comp.differences.filter(d => d.status === 'added');
				const removed = comp.differences.filter(d => d.status === 'removed');
				const modified = comp.differences.filter(d => d.status === 'modified');

				if (added.length > 0) {
					console.log(`   🟢 Added in DB2: ${added.length}`);
					added.slice(0, 5).forEach(d => console.log(`      - ${d._id}`));
					if (added.length > 5) console.log(`      ... and ${added.length - 5} more`);
				}

				if (removed.length > 0) {
					console.log(`   🔴 Removed in DB2: ${removed.length}`);
					removed.slice(0, 5).forEach(d => console.log(`      - ${d._id}`));
					if (removed.length > 5) console.log(`      ... and ${removed.length - 5} more`);
				}

				if (modified.length > 0) {
					console.log(`   🟡 Modified: ${modified.length}`);
					modified.slice(0, 3).forEach(d => {
						console.log(`      Document: ${d._id}`);
						d.fieldChanges?.slice(0, 3).forEach(fc => {
							console.log(`         ${fc.field}: ${JSON.stringify(fc.db1Value)} → ${JSON.stringify(fc.db2Value)}`);
						});
						if ((d.fieldChanges?.length || 0) > 3) {
							console.log(`         ... and ${(d.fieldChanges?.length || 0) - 3} more fields`);
						}
					});
					if (modified.length > 3) console.log(`      ... and ${modified.length - 3} more documents`);
				}
			}
		}

		const totalDifferences = comparisons.reduce(
			(sum, c) => sum + c.onlyInDb1 + c.onlyInDb2 + c.modified,
			0
		);

		console.log(`\n🎯 Final Result:`);
		if (totalDifferences === 0) {
			console.log(`   ✅ Databases are IDENTICAL`);
		} else {
			console.log(`   ⚠️  Found ${totalDifferences} total differences`);
			console.log(`   Use --details flag to see specific changes`);
		}
		console.log();

	} catch (error) {
		console.error('❌ Comparison failed:', error);
		throw error;
	} finally {
		await client.close();
	}
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
	console.log(`
Database Deep Comparison Tool

Usage:
  bun run db:compare <database1> <database2> [options]

Arguments:
  database1   First database (dev | uat | test)
  database2   Second database (dev | uat | test)

Options:
  --sample <n>  Only compare first N documents per collection
  --details     Show detailed differences (added/removed/modified docs)

Examples:
  # Quick comparison (counts only)
  bun run db:compare dev uat

  # Detailed comparison
  bun run db:compare dev uat --details

  # Sample comparison (faster)
  bun run db:compare dev uat --sample 100

  # Full detailed comparison with sampling
  bun run db:compare dev uat --sample 500 --details

Use cases:
  # Verify clone operation
  bun run db:compare dev uat

  # Check sync status
  bun run db:compare dev uat --details

  # Quick health check
  bun run db:compare dev uat --sample 50

  # Investigate discrepancies
  bun run db:compare dev uat --details
`);
	process.exit(0);
}

const database1 = args[0] as keyof typeof DB_TARGETS;
const database2 = args[1] as keyof typeof DB_TARGETS;

if (!database1 || !database2) {
	console.error('❌ Usage: bun run db:compare <database1> <database2> [options]');
	process.exit(1);
}

if (!DB_TARGETS[database1] || !DB_TARGETS[database2]) {
	console.error('❌ Invalid database names');
	console.error('   Valid options: dev, uat, test');
	process.exit(1);
}

if (database1 === database2) {
	console.error('❌ Cannot compare database with itself');
	process.exit(1);
}

const sampleIndex = args.indexOf('--sample');
const sampleSize = sampleIndex !== -1 ? parseInt(args[sampleIndex + 1]) : undefined;
const showDetails = args.includes('--details');

compareDatabases(database1, database2, { sampleSize, showDetails })
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
