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
		colls.map((x,i)=>{ console.log(`${i+1}. ${x.name}`) })
		console.log(`Found ${colls.length} collections\n\n`);

		// Execute Opr
		// const result = await coll.updateOne( { _id:new ObjectId('68f511fafc205f99615b5bbc')},
		// 	[{ $set: { assignments: { 
		// 		_id: new ObjectId(),
		// 		organizationId: "$organizationId",
		// 		orgUnitId: "$orgUnitId",
		// 		positionId: "$positionId",
		// 		employeeId: "$employeeId",
				
		// 		region: "$region",
		// 		workLocation: "$workLocation",
		// 		isRemote: "$isRemote",
				
		// 		// Employment details
		// 		employmentType: "$employmentType",
		// 		employmentStatus: "$employmentStatus",

		// 		letterId: null,
		// 		letterNo: null,

		// 		startDate: "$startDate",
		// 		endDate: "$endDate",

		// 		createdAt: new Date(),
		// 		createdBy: 'system'
		// 	}} }]
		// 	// {	
		// 	// 	// $unset: {  secondaryAssignments: '' }  ,
		// 	// 	$set:{ assignments: '' }
		// 	// }
		// );
		// console.log(`Modified: ${result.modifiedCount} documents\n`);

		// const rem=await db.collection('positions').deleteMany({ 
		// 	organizationId: { $exists: false } 
		// });
		// console.log(`removed ${rem.deletedCount} documents\n\n`);
		
		// const upd=await db.collection('positions').updateMany({organizationId:new ObjectId('690259c35d70b2961ad12894')},
		// { 
		// 	$set:{organizationId: '690259c35d70b2961ad12894' }
		// });
		// console.log(`Modified: ${upd.modifiedCount} documents\n`);
		
		// const pos=await db.collection('positions').find().toArray();
		// pos.map(x=>{ console.log(x) })
		// console.log(`Found ${pos.length} documents\n\n`);

		const rec = await coll.find({_id:new ObjectId('68f511fafc205f99615b5bbc')}).
			// limit(20).
			toArray();
		rec.map(x=>{ console.log(x) })
		console.log(`Found ${rec.length} documents\n\n`);

	} catch (err) {
		console.error('Error:', err);
		process.exit(1);
	}
	process.exit(0);
}

main();
