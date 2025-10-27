#!/usr/bin/env bun

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const client = new MongoClient(MONGODB_URI);

async function checkStructure() {
	await client.connect();
	const db = client.db('test_clone_verify');
	
	console.log('Checking identity structure...\n');
	
	const identities = await db.collection('identities').find({ identityType: 'employee' }).limit(3).toArray();
	
	console.log(`Found ${identities.length} sample identities:\n`);
	
	identities.forEach((identity, idx) => {
		console.log(`Identity ${idx + 1}:`);
		console.log(`  _id: ${identity._id}`);
		console.log(`  identityType: ${identity.identityType}`);
		console.log(`  email: ${identity.email}`);
		console.log(`  firstName: ${identity.firstName}`);
		console.log(`  lastName: ${identity.lastName}`);
		console.log(`  employeeId: ${identity.employeeId}`);
		console.log(`  Keys: ${Object.keys(identity).join(', ')}`);
		console.log();
	});
	
	await client.close();
}

checkStructure().catch(console.error);
