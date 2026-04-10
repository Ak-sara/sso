import { MongoClient, type Db } from 'mongodb';
import { setMongo, useMongo, useLogger } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'db' });

let client: MongoClient | null = null;

export async function connectDB(uri: string, dbName: string): Promise<Db> {
	if (client) return useMongo<Db>();

	client = new MongoClient(uri);
	await client.connect();
	const db = client.db(dbName);

	// Inject into FBA singleton (uses SSO's own mongodb driver — avoids dual-bson)
	setMongo(db);

	log.info('Connected to MongoDB Atlas');
	return db;
}

export function getDB(): Db {
	return useMongo<Db>();
}

export async function disconnectDB(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		log.info('Disconnected from MongoDB');
	}
}
