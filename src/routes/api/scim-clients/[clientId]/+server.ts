import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';

/**
 * GET /api/scim-clients/[clientId]
 * Fetch a single SCIM client by clientId
 */
export const GET: RequestHandler = async ({ params }) => {
	const db = getDB();
	const client = await db.collection('scim_clients').findOne({
		clientId: params.clientId
	});

	if (!client) {
		return json({ error: 'Client not found' }, { status: 404 });
	}

	return json({
		...client,
		_id: client._id.toString(),
		organizationId: client.organizationId?.toString() || null,
		clientSecret: undefined // Never send secret to client
	});
};

/**
 * PUT /api/scim-clients/[clientId]
 * Update a SCIM client
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
		const scopes = Array.isArray(data.scopes)
			? data.scopes
			: ['read:users', 'read:groups'];

		const ipWhitelist = Array.isArray(data.ipWhitelist)
			? data.ipWhitelist
			: undefined;

		// Update client
		const updateFields: any = {
			clientName: data.clientName,
			scopes,
			rateLimit: data.rateLimit || 100,
			isActive: data.isActive !== undefined ? data.isActive : true,
			description: data.description || '',
			contactEmail: data.contactEmail || '',
			updatedAt: new Date()
		};

		if (ipWhitelist !== undefined) {
			updateFields.ipWhitelist = ipWhitelist;
		}

		const result = await db.collection('scim_clients').updateOne(
			{ clientId: params.clientId },
			{ $set: updateFields }
		);

		if (result.matchedCount === 0) {
			return json({ error: 'Client not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Client updated successfully' });
	} catch (error: any) {
		console.error('Error updating SCIM client:', error);
		return json({ error: error.message || 'Failed to update client' }, { status: 500 });
	}
};
