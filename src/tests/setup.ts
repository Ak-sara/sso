import { beforeAll, afterAll } from 'vitest';
import { connectDB, disconnectDB } from '$lib/db/connection';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env file
try {
	const envPath = join(process.cwd(), '.env');
	const envFile = readFileSync(envPath, 'utf-8');
	const envVars = envFile.split('\n').filter(line => line && !line.startsWith('#'));
	for (const line of envVars) {
		const [key, ...valueParts] = line.split('=');
		if (key && valueParts.length > 0) {
			const value = valueParts.join('=').trim();
			if (!process.env[key]) {
				process.env[key] = value;
			}
		}
	}
} catch (error) {
	console.warn('Could not load .env file:', error);
}

// Setup test environment
beforeAll(async () => {
	// Connect to test database
	await connectDB();
});

afterAll(async () => {
	// Disconnect from database
	await disconnectDB();
});
