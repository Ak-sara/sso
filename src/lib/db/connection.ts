import { MongoClient, Db } from 'mongodb';
import { env } from '$env/dynamic/private';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
	if (db) {
		return db;
	}

	// Try to get from SvelteKit env first, fallback to process.env for tests
	const uri = env.MONGODB_URI || process.env.MONGODB_URI;
	const dbName = env.MONGODB_DB || process.env.MONGODB_DB;

	if (!uri || !dbName) {
		throw new Error('MONGODB_URI and MONGODB_DB must be set in environment variables');
	}

	try {
		client = new MongoClient(uri);
		await client.connect();
		db = client.db(dbName);
		console.log('✅ Connected to MongoDB Atlas');
		return db;
	} catch (error) {
		console.error('❌ MongoDB connection error:', error);
		throw error;
	}
}

export async function disconnectDB(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		db = null;
		console.log('🔌 Disconnected from MongoDB');
	}
}

export function getDB(): Db {
	if (!db) {
		throw new Error('Database not connected. Call connectDB() first.');
	}
	return db;
}
