import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';

/**
 * GET /api/oauth-clients/[clientId]
 * Fetch a single OAuth client by clientId
 */
export const GET: RequestHandler = async ({ params }) => {
	const db = getDB();
	const client = await db.collection('oauth_clients').findOne({
		clientId: params.clientId
	});

	if (!client) {
		return json({ error: 'Client not found' }, { status: 404 });
	}

	return json({
		...client,
		_id: client._id.toString(),
		organizationId: client.organizationId?.toString() || null,
		serviceAccountId: client.serviceAccountId?.toString() || null,
		clientSecret: undefined // Never send secret to client
	});
};

/**
 * PUT /api/oauth-clients/[clientId]
 * Update an OAuth client
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();
		const data = await request.json();

		// Validate required fields
		if (!data.clientName) {
			return json({ error: 'Client name is required' }, { status: 400 });
		}

		// Ensure arrays are properly formatted
		const redirectUris = Array.isArray(data.redirectUris)
			? data.redirectUris
			: [];

		const allowedScopes = Array.isArray(data.allowedScopes)
			? data.allowedScopes
			: ['openid', 'profile', 'email'];

		const grantTypes = Array.isArray(data.grantTypes)
			? data.grantTypes
			: ['authorization_code', 'refresh_token'];

		// Update client
		const result = await db.collection('oauth_clients').updateOne(
			{ clientId: params.clientId },
			{
				$set: {
					clientName: data.clientName,
					redirectUris,
					allowedScopes,
					grantTypes,
					isActive: data.isActive !== undefined ? data.isActive : true,
					updatedAt: new Date()
				}
			}
		);

		if (result.matchedCount === 0) {
			return json({ error: 'Client not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Client updated successfully' });
	} catch (error: any) {
		console.error('Error updating OAuth client:', error);
		return json({ error: error.message || 'Failed to update client' }, { status: 500 });
	}
};
