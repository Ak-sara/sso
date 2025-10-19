/**
 * Script to create SCIM client for OFM app
 * Run with: bun run scripts/create-scim-client-for-ofm.ts
 */

import { connectDB, disconnectDB } from '../src/lib/db/connection';
import { generateScimClient } from '../src/lib/scim/auth-enhanced';

async function main() {
	console.log('🔧 Creating SCIM client for OFM...\n');

	try {
		// Connect to database first
		await connectDB();
		console.log('✅ Connected to database\n');

		const { client, plainSecret } = await generateScimClient({
			clientName: 'OFM Production',
			scopes: ['read:users', 'read:groups', 'write:users'],
			rateLimit: 100,
			ipWhitelist: [], // Add OFM server IPs here if needed
			createdBy: 'system'
		});

		console.log('✅ SCIM client created successfully!\n');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('📋 COPY THESE CREDENTIALS TO OFM .env FILE');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		console.log(`SCIM_CLIENT_ID=${client.clientId}`);
		console.log(`SCIM_CLIENT_SECRET=${plainSecret}\n`);
		console.log('⚠️  WARNING: This is the ONLY time you will see the secret!');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

		console.log('Client Details:');
		console.log(`  Name: ${client.clientName}`);
		console.log(`  Scopes: ${client.scopes.join(', ')}`);
		console.log(`  Rate Limit: ${client.rateLimit} req/min`);
		console.log(`  Active: ${client.isActive}\n`);

		console.log('Next steps:');
		console.log('  1. Copy the credentials above to ofm/.env');
		console.log('  2. Test OAuth token generation:');
		console.log(`     curl -X POST http://localhost:5173/scim/v2/token \\`);
		console.log(`       -d "grant_type=client_credentials" \\`);
		console.log(`       -d "client_id=${client.clientId}" \\`);
		console.log(`       -d "client_secret=${plainSecret}"`);
	} catch (error) {
		console.error('❌ Failed to create SCIM client:', error);
		process.exit(1);
	} finally {
		await disconnectDB();
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
