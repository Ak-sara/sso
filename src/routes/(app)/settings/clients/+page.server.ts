import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { generateClientId, generateClientSecret } from '$lib/crypto';
import { hash } from '@node-rs/argon2';
import { createIdentity } from '$lib/services/identity-service';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const [clients, organizations] = await Promise.all([
		db.oauthClients.find({}, { createdAt: -1 }),
		db.organizations.find({ isActive: true } as any, { name: 1 })
	]);
	const orgNameById = new Map(organizations.map((o: any) => [o._id.toString(), `${o.code} - ${o.name}`]));
	return {
		clients: clients.map((c: any) => ({
			...c,
			_id: c._id.toString(),
			organizationId: c.organizationId?.toString() || null,
			organizationName: c.organizationId ? orgNameById.get(c.organizationId.toString()) || null : null,
			serviceAccountId: c.serviceAccountId?.toString() || null
		})),
		organizations: organizations.map((o: any) => ({ _id: o._id.toString(), code: o.code, name: o.name }))
	};
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const formData = locals.body
		const name = (formData?.name as string || '').trim();
		const redirectUris = ((formData?.redirect_uris as string) || '')
			.split('\n').map((uri: string) => uri.trim()).filter(Boolean);
		const allowedScopes = formData?.allowed_scopes as string;
		const organizationId = (formData?.organization_id as string) || undefined;

		if (!name) return fail(400, { error: 'Client name is required' });
		if (redirectUris.length === 0) return fail(400, { error: 'At least one redirect URI is required' });

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
		if (!saResult.ok) return fail(400, { error: saResult.error });
		const serviceAccountId = saResult.data._id;

		await db.oauthClients.insertOne({
			clientId, clientSecret: hashedSecret, clientName: name,
			redirectUris,
			allowedScopes: scopes,
			grantTypes: ['authorization_code', 'refresh_token'],
			isActive: true, serviceAccountId, organizationId
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

		if (!clientId) return fail(400, { error: 'Client ID is required' });

		const deleted = await db.oauthClients.deleteOne({ clientId });
		if (!deleted) return fail(404, { error: 'Client not found' });

		return { success: 'Client deleted successfully' };
	},

	// App Roles — in-app permissions scoped to one OAuth client, assigned via
	// an identity's assignment (assignments[].clientRoleIds) and surfaced as
	// a `roles` claim in the ID token / userinfo.
	createClientRole: async ({ locals }) => {
		const formData = locals.body;
		const clientId = (formData?.clientId as string || '').trim();
		const name = (formData?.name as string || '').trim();
		const description = (formData?.description as string) || undefined;

		if (!clientId) return fail(400, { error: 'Client ID is required' });
		if (!name) return fail(400, { error: 'Role name is required' });

		await db.clientRoles.insertOne({ clientId, name, description } as any);
		return { success: 'App role created' };
	},

	deleteClientRole: async ({ locals }) => {
		const formData = locals.body;
		const id = formData?._id as string;
		if (!id) return fail(400, { error: 'Role id is required' });

		const deleted = await db.clientRoles.deleteById(id);
		if (!deleted) return fail(404, { error: 'App role not found' });

		return { success: 'App role deleted' };
	}
};
