/**
 * SCIM Client Management - Server
 * Admin interface for managing SCIM client credentials
 */

import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import type { ScimClient } from '$lib/db/schemas';
import {
	generateScimClient,
	deactivateScimClient,
	deleteScimClient,
	rotateClientSecret,
	getClientStats
} from '$lib/scim/auth-enhanced';
import { fail } from '@sveltejs/kit';
import { useLogger } from '@ak-sara/fbao/foundation';
import { parseJsonArrayField } from '$lib/utils/form-json';

const log = useLogger({ module: 'app:clients-scim' });

export const load: PageServerLoad = async ({ locals }) => {
	// TODO: Check if user is admin
	// if (!locals.user || locals.user.role !== 'admin') {
	//   throw redirect(302, '/');
	// }

	const clients = await db.scimClients.col.find({}).sort({ createdAt: -1 }).toArray() as ScimClient[];

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
	create: async ({ locals }) => {
		try {
			const formData = locals.body

			const clientName = formData?.clientName;
			const description = formData?.description;
			const contactEmail = formData?.contactEmail;
			const scopes = parseJsonArrayField(formData?.scopes);
			const rateLimit = parseInt(formData?.rateLimit || '100');
			const ipWhitelist = ((formData?.ipWhitelist as string) || '').split('\n')
				.map((ip:string) => ip.trim())
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
			log.error('Error creating SCIM client', { error });
			return fail(500, { error: error.message });
		}
	},

	deactivate: async ({ locals }) => {
		try {
			const formData = locals.body
			const clientId = formData?.clientId;

			if (!clientId) {
				return fail(400, { error: 'Client ID is required' });
			}

			await deactivateScimClient(clientId);

			return { success: true, message: 'Client deactivated successfully' };
		} catch (error: any) {
			log.error('Error deactivating client', { error });
			return fail(500, { error: error.message });
		}
	},

	rotateSecret: async ({ locals }) => {
		try {
			const formData = locals.body
			const clientId = formData?.clientId;

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
			log.error('Error rotating secret', { error });
			return fail(500, { error: error.message });
		}
	},

	delete: async ({ locals }) => {
		try {
			const formData = locals.body
			const clientId = formData?.clientId;

			if (!clientId) {
				return fail(400, { error: 'Client ID is required' });
			}

			await deleteScimClient(clientId);

			return { success: true, message: 'Client deleted permanently' };
		} catch (error: any) {
			log.error('Error deleting client', { error });
			return fail(error.status || 500, { error: error.body?.message || error.message });
		}
	}
} satisfies Actions;
