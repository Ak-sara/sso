import { connectDB } from '$lib/db/connection';
import type { Handle } from '@sveltejs/kit';

// Connect to database on server startup
let dbConnected = false;

async function ensureDBConnection() {
	if (!dbConnected) {
		try {
			await connectDB();
			dbConnected = true;
		} catch (error) {
			console.error('Failed to connect to database:', error);
			throw error;
		}
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Ensure database is connected
	await ensureDBConnection();

	// Continue with request
	return resolve(event);
};
