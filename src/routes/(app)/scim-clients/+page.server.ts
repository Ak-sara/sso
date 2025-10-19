/**
 * SCIM Client Management - Server
 * Admin interface for managing SCIM client credentials
 */

import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import type { ScimClient } from '$lib/db/schemas';
import {
	generateScimClient,
	deactivateScimClient,
	deleteScimClient,
	rotateClientSecret,
	getClientStats
} from '$lib/scim/auth-enhanced';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// TODO: Check if user is admin
	// if (!locals.user || locals.user.role !== 'admin') {
	//   throw redirect(302, '/');
	// }

	const db = getDB();

	// Get all SCIM clients
	const clients = await db
		.collection<ScimClient>('scim_clients')
		.find({})
		.sort({ createdAt: -1 })
		.toArray();

	// Get stats for each client
	const clientsWithStats = await Promise.all(
		clients.map(async (client) => {
			try {
				const stats = await getClientStats(client.clientId);
				return {
					...client,
					_id: client._id?.toString(),
					organizationId: client.organizationId?.toString(),
					stats
				};
			} catch {
				return {
					...client,
					_id: client._id?.toString(),
					organizationId: client.organizationId?.toString(),
					stats: null
				};
			}
		})
	);

	return {
		clients: clientsWithStats.map((c) => ({
			...c,
			clientSecret: undefined // Never send to client
		}))
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		try {
			const formData = await request.formData();

			const clientName = formData.get('clientName')?.toString();
			const description = formData.get('description')?.toString();
			const contactEmail = formData.get('contactEmail')?.toString();
			const scopes = formData.getAll('scopes').map((s) => s.toString());
			const rateLimit = parseInt(formData.get('rateLimit')?.toString() || '100');
			const ipWhitelist = formData
				.get('ipWhitelist')
				?.toString()
				.split('\n')
				.map((ip) => ip.trim())
				.filter(Boolean);

			if (!clientName) {
				return fail(400, { error: 'Client name is required' });
			}

			// Generate SCIM client
			const { client, plainSecret } = await generateScimClient({
				clientName,
				description,
				contactEmail,
				scopes: scopes as any,
				rateLimit,
				ipWhitelist,
				createdBy: locals.user?.email || 'system'
			});

			return {
				success: true,
				client: {
					clientId: client.clientId,
					clientName: client.clientName
				},
				plainSecret // Show only once!
			};
		} catch (error: any) {
			console.error('Error creating SCIM client:', error);
			return fail(500, { error: error.message });
		}
	},

	deactivate: async ({ request }) => {
		try {
			const formData = await request.formData();
			const clientId = formData.get('clientId')?.toString();

			if (!clientId) {
				return fail(400, { error: 'Client ID is required' });
			}

			await deactivateScimClient(clientId);

			return { success: true, message: 'Client deactivated successfully' };
		} catch (error: any) {
			console.error('Error deactivating client:', error);
			return fail(500, { error: error.message });
		}
	},

	rotateSecret: async ({ request }) => {
		try {
			const formData = await request.formData();
			const clientId = formData.get('clientId')?.toString();

			if (!clientId) {
				return fail(400, { error: 'Client ID is required' });
			}

			const { plainSecret } = await rotateClientSecret(clientId);

			return {
				success: true,
				plainSecret, // Show only once!
				message: 'Secret rotated successfully. All existing tokens have been revoked.'
			};
		} catch (error: any) {
			console.error('Error rotating secret:', error);
			return fail(500, { error: error.message });
		}
	},

	delete: async ({ request }) => {
		try {
			const formData = await request.formData();
			const clientId = formData.get('clientId')?.toString();

			if (!clientId) {
				return fail(400, { error: 'Client ID is required' });
			}

			await deleteScimClient(clientId);

			return { success: true, message: 'Client deleted permanently' };
		} catch (error: any) {
			console.error('Error deleting client:', error);
			return fail(error.status || 500, { error: error.body?.message || error.message });
		}
	}
} satisfies Actions;
