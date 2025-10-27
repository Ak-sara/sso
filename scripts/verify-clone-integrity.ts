#!/usr/bin/env bun

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function verifyCloneIntegrity(dbName: string) {
	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is required');
	}

	const client = new MongoClient(MONGODB_URI);

	try {
		await client.connect();
		console.log(`✅ Connected to MongoDB Atlas\n`);

		const db = client.db(dbName);

		console.log(`🔍 Verifying referential integrity in: ${dbName}\n`);

		// Get a sample identity with references
		const identity = await db.collection('identities').findOne({
			identityType: 'employee',
			organizationId: { $exists: true, $ne: null },
			orgUnitId: { $exists: true, $ne: null }
		});
		if (!identity) {
			console.log('❌ No identity found in database');
			return;
		}

		console.log(`📋 Checking identity: ${identity.firstName} ${identity.lastName}`);
		console.log(`   employeeId: ${identity.employeeId}`);
		console.log(`   organizationId: ${identity.organizationId}`);
		console.log(`   orgUnitId: ${identity.orgUnitId}`);
		console.log(`   positionId: ${identity.positionId}`);
		console.log(`   managerId: ${identity.managerId || 'N/A'}\n`);

		let passedChecks = 0;
		let totalChecks = 0;

		// Verify organization reference
		if (identity.organizationId) {
			totalChecks++;
			const org = await db
				.collection('organizations')
				.findOne({ _id: new ObjectId(identity.organizationId) });
			if (org) {
				console.log(`✅ Organization reference valid: ${org.name}`);
				passedChecks++;
			} else {
				console.log(`❌ Organization reference broken: ${identity.organizationId}`);
			}
		}

		// Verify org unit reference
		if (identity.orgUnitId) {
			totalChecks++;
			const unit = await db
				.collection('org_units')
				.findOne({ _id: new ObjectId(identity.orgUnitId) });
			if (unit) {
				console.log(`✅ OrgUnit reference valid: ${unit.name}`);
				passedChecks++;
			} else {
				console.log(`❌ OrgUnit reference broken: ${identity.orgUnitId}`);
			}
		}

		// Verify position reference
		if (identity.positionId) {
			totalChecks++;
			const position = await db
				.collection('positions')
				.findOne({ _id: new ObjectId(identity.positionId) });
			if (position) {
				console.log(`✅ Position reference valid: ${position.name}`);
				passedChecks++;
			} else {
				console.log(`❌ Position reference broken: ${identity.positionId}`);
			}
		}

		// Verify manager reference (if exists)
		if (identity.managerId) {
			totalChecks++;
			const manager = await db
				.collection('identities')
				.findOne({ _id: new ObjectId(identity.managerId) });
			if (manager) {
				console.log(`✅ Manager reference valid: ${manager.firstName} ${manager.lastName}`);
				passedChecks++;
			} else {
				console.log(`❌ Manager reference broken: ${identity.managerId}`);
			}
		}

		console.log(`\n${'='.repeat(60)}`);
		if (passedChecks === totalChecks) {
			console.log(`✅ All ${totalChecks} reference checks passed!`);
		} else {
			console.log(`❌ ${totalChecks - passedChecks}/${totalChecks} reference checks failed!`);
		}
		console.log(`${'='.repeat(60)}\n`);
	} catch (error) {
		console.error('❌ Verification failed:', error);
		throw error;
	} finally {
		await client.close();
		console.log('🔌 Disconnected from MongoDB Atlas');
	}
}

const dbName = process.argv[2];

if (!dbName || process.argv.includes('--help')) {
	console.log(`
Clone Integrity Verification Tool

Usage:
  bun run scripts/verify-clone-integrity.ts <database-name>

Example:
  bun run scripts/verify-clone-integrity.ts test_clone_verify
`);
	process.exit(0);
}

verifyCloneIntegrity(dbName)
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
