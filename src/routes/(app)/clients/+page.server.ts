import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { generateClientId, generateClientSecret } from '$lib/crypto';
import { hash } from '@node-rs/argon2';
import { identityRepository } from '$lib/db/identity-repository';

export const load: PageServerLoad = async () => {
	const db = getDB();
	const clients = await db.collection('oauth_clients').find({}).sort({ createdAt: -1 }).toArray();

	return {
		clients: clients.map((c) => ({
			...c,
			_id: c._id.toString(),
			organizationId: c.organizationId?.toString() || null,
			serviceAccountId: c.serviceAccountId?.toString() || null
		})),
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const redirectUris = formData.get('redirect_uris') as string;
		const allowedScopes = formData.get('allowed_scopes') as string;

		const clientId = generateClientId();
		const clientSecret = generateClientSecret();
		const hashedSecret = await hash(clientSecret);

		// Create service account identity for this OAuth client
		const serviceAccountUsername = `${clientId}-sa`;
		const scopes = allowedScopes ? allowedScopes.split(' ').filter(Boolean) : ['openid'];

		const serviceAccount = await identityRepository.create({
			identityType: 'service_account',
			username: serviceAccountUsername,
			email: `${clientId}@service.ias.co.id`,
			password: hashedSecret, // Use same password as client secret
			isActive: true,
			emailVerified: true,
			roles: ['service_account'],
			firstName: name,
			lastName: 'Service Account',
			fullName: `${name} Service Account`,
			organizationId: '', // Service accounts are organization-agnostic
			customProperties: {
				clientId,
				allowedScopes: scopes,
				grantTypes: ['authorization_code', 'refresh_token'],
				description: `Automated service account for OAuth client: ${name}`
			},
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Create OAuth client with link to service account
		const db = getDB();
		await db.collection('oauth_clients').insertOne({
			clientId,
			clientSecret: hashedSecret,
			clientName: name,
			redirectUris: redirectUris.split('\n').map((uri) => uri.trim()).filter(Boolean),
			allowedScopes: scopes,
			grantTypes: ['authorization_code', 'refresh_token'],
			isActive: true,
			serviceAccountId: serviceAccount._id!.toString(), // Link to service account
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return {
			success: 'OAuth client dan service account berhasil dibuat',
			client: { client_id: clientId, client_secret: clientSecret },
			service_account: { username: serviceAccountUsername, id: serviceAccount._id!.toString() }
		};
	},
};
