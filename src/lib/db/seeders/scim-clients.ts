import type { Db } from 'mongodb';
import { hash } from '@node-rs/argon2';
import { ObjectId } from 'mongodb';

interface SeedScimClientsOptions {
	clear?: boolean;
	iasId?: string;
}

/**
 * Seed SCIM Clients
 * Creates 3 SCIM clients for integration testing
 */
export async function seedScimClients(db: Db, options: SeedScimClientsOptions): Promise<void> {
	const { clear = false, iasId } = options;

	console.log('🔐 Seeding SCIM Clients (3 clients)...');

	if (clear) {
		await db.collection('scim_clients').deleteMany({});
	}

	// Hash secrets with Argon2
	const ofmSecret = await hash('ofm-scim-secret-prod-2024');
	const googleSecret = await hash('google-workspace-scim-key');
	const slackSecret = await hash('slack-scim-integration-token');

	const scimClients = [
		{
			clientId: 'scim-ofm-prod',
			clientName: 'OFM Production',
			clientSecret: ofmSecret,
			organizationId: iasId ? new ObjectId(iasId) : undefined,
			scopes: [
				'read:users',
				'write:users',
				'delete:users',
				'read:groups',
				'write:groups',
				'bulk:operations'
			],
			accessTokenExpiresIn: 3600,
			ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
			rateLimit: 100,
			isActive: true,
			usage: {
				totalRequests: 15234,
				lastRequestAt: new Date('2025-01-20T14:30:00Z'),
				totalErrors: 12,
				lastErrorAt: new Date('2025-01-18T09:15:00Z')
			},
			createdAt: new Date('2024-06-01'),
			updatedAt: new Date('2025-01-20'),
			createdBy: 'system'
		},
		{
			clientId: 'scim-google-workspace',
			clientName: 'Google Workspace',
			clientSecret: googleSecret,
			organizationId: iasId ? new ObjectId(iasId) : undefined,
			scopes: [
				'read:users',
				'write:users',
				'read:groups'
			],
			accessTokenExpiresIn: 3600,
			rateLimit: 50,
			isActive: true,
			usage: {
				totalRequests: 8542,
				lastRequestAt: new Date('2025-01-20T12:00:00Z'),
				totalErrors: 3,
				lastErrorAt: new Date('2025-01-10T16:45:00Z')
			},
			createdAt: new Date('2024-08-15'),
			updatedAt: new Date('2025-01-20'),
			createdBy: 'system'
		},
		{
			clientId: 'scim-slack-integration',
			clientName: 'Slack Enterprise',
			clientSecret: slackSecret,
			organizationId: iasId ? new ObjectId(iasId) : undefined,
			scopes: [
				'read:users',
				'read:groups'
			],
			accessTokenExpiresIn: 7200,
			rateLimit: 30,
			isActive: true,
			usage: {
				totalRequests: 2341,
				lastRequestAt: new Date('2025-01-19T18:20:00Z'),
				totalErrors: 1,
				lastErrorAt: new Date('2025-01-05T11:30:00Z')
			},
			createdAt: new Date('2024-10-01'),
			updatedAt: new Date('2025-01-19'),
			createdBy: 'system'
		}
	];

	await db.collection('scim_clients').insertMany(scimClients);
	console.log(`✅ Created ${scimClients.length} SCIM clients`);
	console.log(`   - OFM Production (full access)`);
	console.log(`   - Google Workspace (user sync)`);
	console.log(`   - Slack Enterprise (read-only)`);
}
