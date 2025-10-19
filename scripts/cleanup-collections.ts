#!/usr/bin/env bun
/**
 * Cleanup script to remove incorrectly named collections
 * This removes 'orgUnits' and keeps 'org_units'
 */

import { connectDB, disconnectDB, getDB } from '../src/lib/db/connection';

async function cleanup() {
	try {
		await connectDB();
		const db = getDB();

		console.log('🧹 Cleaning up collections...\n');

		// List all collections
		const collections = await db.listCollections().toArray();
		console.log('📋 Current collections:');
		collections.forEach(col => console.log(`  - ${col.name}`));
		console.log('');

		// Check for duplicate collections with different naming conventions
		const incorrectCollections = ['orgUnits', 'employees', 'users', 'partners'];

		for (const collectionName of incorrectCollections) {
			const exists = collections.find(c => c.name === collectionName);
			if (exists) {
				console.log(`❌ Found incorrect collection: ${collectionName}`);
				console.log(`   Dropping ${collectionName}...`);
				await db.collection(collectionName).drop();
				console.log(`   ✅ Dropped ${collectionName}\n`);
			}
		}

		// Verify correct collections exist
		const correctCollections = [
			'org_units',
			'identities',
			'organizations',
			'positions',
			'oauth_clients',
			'auth_codes',
			'refresh_tokens'
		];

		console.log('\n✅ Correct collections that should exist:');
		for (const collectionName of correctCollections) {
			const exists = collections.find(c => c.name === collectionName);
			if (exists) {
				const count = await db.collection(collectionName).countDocuments();
				console.log(`  ✓ ${collectionName} (${count} documents)`);
			} else {
				console.log(`  ⚠️  ${collectionName} (not found - will be created on seed)`);
			}
		}

		console.log('\n✨ Cleanup complete!');
		console.log('💡 Run "bun run db:seed" to populate the database with correct data.\n');

	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	} finally {
		await disconnectDB();
	}
}

cleanup();
