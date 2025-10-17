import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { generateClientId, generateClientSecret } from '$lib/crypto';
import { hash } from '@node-rs/argon2';

export const load: PageServerLoad = async () => {
	const db = getDB();
	const clients = await db.collection('oauth_clients').find({}).sort({ createdAt: -1 }).toArray();

	return {
		clients: clients.map((c) => ({
			...c,
			_id: c._id.toString(),
			organizationId: c.organizationId?.toString() || null
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

		const db = getDB();
		await db.collection('oauth_clients').insertOne({
			clientId,
			clientSecret: await hash(clientSecret),
			clientName: name,
			redirectUris: redirectUris.split('\n').map((uri) => uri.trim()).filter(Boolean),
			allowedScopes: allowedScopes ? allowedScopes.split(' ').filter(Boolean) : ['openid'],
			grantTypes: ['authorization_code', 'refresh_token'],
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return {
			success: 'OAuth client berhasil dibuat',
			client: { client_id: clientId, client_secret: clientSecret },
		};
	},
};
