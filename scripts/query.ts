#!/usr/bin/env bun
import { UpdateResult } from 'mongodb';
import { connectDB, disconnectDB, getDB } from '../src/lib/db/connection';

const MONGODB_URI = process.env.MONGODB_URI || '';
const COLL_NAME = "org_units";

async function runQuery(args: string[]): Promise<UpdateResult<Document>> {
    console.log('args:',args);

    const db = getDB();
    let ret:UpdateResult<Document>;
    try {
        ret=await db.collection(COLL_NAME).updateMany(
            { board: { $in: ["a", "d"] } }, // Optional filter: limits updates to only relevant docs
            [
                {
                $set: {
                    board: {
                    $switch: {
                        branches: [
                        { case: { $eq: ["$board", "a"] }, then: "b" },
                        { case: { $eq: ["$board", "d"] }, then: "a" }
                        ],
                        default: "$board" // Keeps original value if no branch matches
                    }
                    }
                }
                }
            ]
        );
    } catch (error: any) {
        console.error(error);
        throw error;
    }
    return ret;
}

async function main() {
    const args = process.argv.slice(2);

    try {
        const [conn,exec] = await Promise.all([
            connectDB(MONGODB_URI,COLL_NAME),
            runQuery(args)
        ]);
        console.log('Log:',{connection:conn,exec:exec});
        await disconnectDB();
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Seeding failed:', error);
        await disconnectDB();
        process.exit(1);
    }
}

// Run
main();
