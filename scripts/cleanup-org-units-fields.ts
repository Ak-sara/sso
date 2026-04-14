#!/usr/bin/env bun
/**
 * Usage:
 *   bun run scripts/cleanup-org-units-fields.ts --check    # Preview changes
 *   bun run scripts/cleanup-org-units-fields.ts              # Execute cleanup
 */

// import { connectDB, getDB } from '../src/lib/db/connection';
import { MongoClient, ObjectId } from 'mongodb';

const isCheck = process.argv.includes('--check');
const MONGODB_URI=process.env.MONGODB_URI as string;

const dbName='aksara_sso'
const collName='identities'

async function main() {	
	const client = new MongoClient(MONGODB_URI);
	await client.connect();
	const db = client.db(dbName);
	const coll = db.collection(collName);
	
	try {
		const colls = await db.listCollections().toArray();
		console.log(`available colls: ${isCheck ? "withCheck":"noCheck"}`);
		colls.map((x,i)=>{ console.log(`${i}. ${x.name}`) })
		console.log(`Found ${colls.length} collections\n\n`);

		// Execute Opr
		// const result = await coll.updateMany( {_id:new ObjectId('69cc9954b454efea52234a22')},
		// 	{	
		// 		// $unset: {  isNeck: '',  level: '', sortOrder: ''  }  
		// 		$set:{code:'NECK'}
		// 	}
		// );
		// console.log(`Modified: ${result.modifiedCount} documents\n`);

		const rec = await coll.find().limit(20).toArray();
		rec.map(x=>{ console.log(x) })
		console.log(`Found ${rec.length} documents\n\n`);

	} catch (err) {
		console.error('Error:', err);
		process.exit(1);
	}
	process.exit(0);
}

main();
