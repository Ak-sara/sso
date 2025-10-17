import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
	if (db) {
		return db;
	}

	// Get environment variables - works in both SvelteKit and standalone scripts
	let uri: string | undefined;
	let dbName: string | undefined;

	// Try SvelteKit env first, fallback to process.env
	try {
		const { env } = await import('$env/dynamic/private');
		uri = env.MONGODB_URI;
		dbName = env.MONGODB_DB;
	} catch {
		// Running outside SvelteKit (e.g., seed script)
		uri = process.env.MONGODB_URI;
		dbName = process.env.MONGODB_DB;
	}

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
