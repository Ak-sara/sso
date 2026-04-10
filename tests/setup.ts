import { isConfigured } from '@ak-sara/fbao/foundation';
import { setupFBA } from '../src/lib/setup';
import { connectDB } from '../src/lib/db/connection';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env and configure FBA once for tests
if (!isConfigured()) {
	const vars: Record<string, string> = {};
	try {
		const envPath = join(process.cwd(), '.env');
		const envFile = readFileSync(envPath, 'utf-8');
		for (const line of envFile.split('\n')) {
			if (!line || line.startsWith('#')) continue;
			const [key, ...rest] = line.split('=');
			if (key && rest.length > 0) vars[key.trim()] = rest.join('=').trim();
		}
	} catch { /* use process.env fallback */ }

	const uri = vars.MONGODB_URI || process.env.MONGODB_URI!;
	const dbName = vars.MONGODB_DB || process.env.MONGODB_DB!;

	setupFBA({ MONGODB_URI: uri, MONGODB_DB: dbName });
	await connectDB(uri, dbName);
}
