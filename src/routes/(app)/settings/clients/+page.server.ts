import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { generateClientId, generateClientSecret } from '$lib/crypto';
import { hash } from '@node-rs/argon2';
import { createIdentity } from '$lib/services/identity-service';

export const load: PageServerLoad = async () => {
	const clients = await db.oauthClients.find({}, { createdAt: -1 });
	return {
		clients: clients.map((c: any) => ({
			...c,
			_id: c._id.toString(),
			organizationId: c.organizationId?.toString() || null,
			serviceAccountId: c.serviceAccountId?.toString() || null
		}))
	};
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const formData = locals.body
		const name = formData?.name;
		const redirectUris = formData?.redirect_uris;
		const allowedScopes = formData?.allowed_scopes;

		const clientId = generateClientId();
		const clientSecret = generateClientSecret();
		const hashedSecret = await hash(clientSecret);
		const scopes = allowedScopes ? allowedScopes.split(' ').filter(Boolean) : ['openid'];

		const saResult = await createIdentity({
			identityType: 'service_account',
			username: `${clientId}-sa`,
			email: `${clientId}@service.co`,
			password: hashedSecret,
			isActive: true, emailVerified: true,
			roles: ['service_account'],
			firstName: name, lastName: 'Service Account',
			fullName: `${name} Service Account`,
			organizationId: '',
			customProperties: {
				clientId, allowedScopes: scopes,
				grantTypes: ['authorization_code', 'refresh_token'],
				description: `Automated service account for OAuth client: ${name}`
			},
			createdAt: new Date(), updatedAt: new Date(),
		} as any);
		if (!saResult.ok) return { error: saResult.error };
		const serviceAccountId = saResult.data._id;

		await db.oauthClients.insertOne({
			clientId, clientSecret: hashedSecret, clientName: name,
			redirectUris: redirectUris.split('\n').map((uri: string) => uri.trim()).filter(Boolean),
			allowedScopes: scopes,
			grantTypes: ['authorization_code', 'refresh_token'],
			isActive: true, serviceAccountId
		} as any);

		return {
			success: 'OAuth client dan service account berhasil dibuat',
			client: { client_id: clientId, client_secret: clientSecret },
			service_account: { username: `${clientId}-sa`, id: serviceAccountId }
		};
	},

	delete: async ({ locals }) => {
		const formData = locals.body
		const clientId = formData?.clientId;

		if (!clientId) return { error: 'Client ID is required' };

		const deleted = await db.oauthClients.deleteOne({ clientId });
		if (!deleted) return { error: 'Client not found' };

		return { success: 'Client deleted successfully' };
	}
};
