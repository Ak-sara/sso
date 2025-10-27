#!/usr/bin/env bun

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const client = new MongoClient(MONGODB_URI);

async function check() {
	await client.connect();
	const db = client.db('test_clone_verify');
	
	const identities = await db.collection('identities').find({ identityType: 'employee' }).limit(5).toArray();
	
	identities.forEach((identity, idx) => {
		console.log(`\nIdentity ${idx + 1}: ${identity.firstName} ${identity.lastName}`);
		console.log(`  organizationId: ${identity.organizationId} (type: ${typeof identity.organizationId})`);
		console.log(`  orgUnitId: ${identity.orgUnitId} (type: ${typeof identity.orgUnitId})`);
		console.log(`  positionId: ${identity.positionId} (type: ${typeof identity.positionId})`);
	});
	
	// Count identities with organizationId
	const withOrg = await db.collection('identities').countDocuments({ 
		identityType: 'employee',
		organizationId: { $exists: true, $ne: null, $ne: undefined }
	});
	console.log(`\nTotal employee identities with organizationId: ${withOrg}`);
	
	await client.close();
}

check().catch(console.error);
