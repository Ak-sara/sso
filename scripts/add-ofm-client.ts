import { MongoClient } from 'mongodb';
import { hash } from 'argon2';

async function addOFMClient() {
	console.log('🔐 Adding OFM OAuth client...');

	const uri = process.env.MONGODB_URI;
	const dbName = process.env.MONGODB_DB;

	if (!uri || !dbName) {
		throw new Error('MONGODB_URI and MONGODB_DB must be set in environment variables');
	}

	const client = new MongoClient(uri);
	await client.connect();
	const db = client.db(dbName);

	// Check if client already exists
	const existing = await db.collection('oauth_clients').findOne({ clientId: 'ofm-client' });

	if (existing) {
		console.log('✅ OFM client already exists');
		console.log('\n📋 Client Credentials:');
		console.log('   Client ID: ofm-client');
		console.log('   Client Secret: ofm-secret-2025');
		console.log('   Redirect URI: http://localhost:5174/auth/callback');
		return;
	}

	// Create new OAuth client for OFM
	const clientSecret = 'ofm-secret-2025';
	const hashedSecret = await hash(clientSecret);

	await db.collection('oauth_clients').insertOne({
		clientId: 'ofm-client',
		clientSecret: hashedSecret,
		clientName: 'Office Facility Management (OFM)',
		redirectUris: [
			'http://localhost:5174/auth/callback',
			'http://localhost:5174/auth/silent-refresh',
			'https://ofm.ias.co.id/auth/callback'
		],
		allowedScopes: ['openid', 'email', 'profile', 'roles'],
		grantTypes: ['authorization_code', 'refresh_token'],
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	console.log('✅ OFM client created successfully!');
	console.log('\n📋 Client Credentials:');
	console.log('   Client ID: ofm-client');
	console.log('   Client Secret: ofm-secret-2025');
	console.log('   Redirect URIs:');
	console.log('     - http://localhost:5174/auth/callback');
	console.log('     - http://localhost:5174/auth/silent-refresh');
	console.log('     - https://ofm.ias.co.id/auth/callback');
	console.log('   Scopes: openid, email, profile, roles');
	console.log('   Grant Types: authorization_code, refresh_token');

	await client.close();
	process.exit(0);
}

addOFMClient().catch((error) => {
	console.error('❌ Error adding OFM client:', error);
	process.exit(1);
});
