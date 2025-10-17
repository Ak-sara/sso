import type { Db } from 'mongodb';
import { hash } from '@node-rs/argon2';
import type { OAuthClient } from '../schemas';

/**
 * Seed OAuth clients
 */
export async function seedOAuthClients(db: Db, options: { clear?: boolean; iasId?: string } = {}) {
	console.log('🔐 Seeding OAuth clients...');

	if (options.clear) {
		await db.collection('oauth_clients').deleteMany({});
	}

	// Get IAS organization if not provided
	let iasId = options.iasId;
	if (!iasId) {
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			console.warn('⚠️  IAS organization not found. Run organizations seeder first.');
			return;
		}
		iasId = ias._id.toString();
	}

	const clients: Partial<OAuthClient>[] = [
		{
			clientId: 'test-client',
			clientSecret: await hash('test-secret'),
			clientName: 'Test Application',
			redirectUris: ['http://localhost:3000/callback', 'http://localhost:3000/auth/callback'],
			allowedScopes: ['openid', 'profile', 'email', 'employees', 'organizations'],
			grantTypes: ['authorization_code', 'refresh_token'],
			isActive: true,
			organizationId: iasId,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			clientId: 'ofm-client',
			clientSecret: await hash('ofm-secret-2025'),
			clientName: 'Office Facility Management (OFM)',
			redirectUris: [
				'http://localhost:5174/auth/callback',
				'http://localhost:5174/auth/silent-refresh',
				'https://ofm.ias.id/auth/callback',
				'https://ofm.ias.co.id/auth/callback'
			],
			allowedScopes: ['openid', 'email', 'profile', 'roles'],
			grantTypes: ['authorization_code', 'refresh_token'],
			isActive: true,
			organizationId: iasId,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			clientId: 'hr-system',
			clientSecret: await hash('hr-secret-key'),
			clientName: 'HR Management System',
			redirectUris: ['https://hr.ias.co.id/auth/callback'],
			allowedScopes: ['openid', 'profile', 'email', 'employees', 'organizations'],
			grantTypes: ['authorization_code', 'refresh_token'],
			isActive: true,
			organizationId: iasId,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	];

	await db.collection('oauth_clients').insertMany(clients);
	console.log(`✅ Created ${clients.length} OAuth clients`);
}

// CLI support
if (import.meta.main) {
	const { connectDB, disconnectDB } = await import('../connection');
	try {
		const db = await connectDB();
		await seedOAuthClients(db, { clear: true });
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await disconnectDB();
	}
}
