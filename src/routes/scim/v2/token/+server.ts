/**
 * SCIM OAuth 2.0 Token Endpoint
 * Client Credentials Grant (RFC 6749)
 *
 * This endpoint allows SCIM clients to obtain access tokens
 * Similar to Okta's /oauth2/v1/token endpoint
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateScimClient } from '$lib/scim/auth-enhanced';

/**
 * POST /scim/v2/token
 * Issue access token for SCIM client
 *
 * Request:
 *   Content-Type: application/x-www-form-urlencoded
 *   grant_type=client_credentials
 *   client_id=scim-xxx
 *   client_secret=yyy
 *
 * Response:
 *   {
 *     "access_token": "eyJhbGc...",
 *     "token_type": "Bearer",
 *     "expires_in": 3600,
 *     "scope": "read:users read:groups"
 *   }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type');

		if (!contentType?.includes('application/x-www-form-urlencoded')) {
			throw error(400, 'Content-Type must be application/x-www-form-urlencoded');
		}

		const formData = await request.formData();

		const grantType = formData.get('grant_type');
		const clientId = formData.get('client_id');
		const clientSecret = formData.get('client_secret');

		// Validate parameters
		if (grantType !== 'client_credentials') {
			throw error(400, 'grant_type must be client_credentials');
		}

		if (!clientId || !clientSecret) {
			throw error(400, 'client_id and client_secret are required');
		}

		// Get client to retrieve scopes
		const { getDB } = await import('$lib/db/connection');
		const db = getDB();
		const client = await db.collection('scim_clients').findOne({ clientId: clientId.toString() });

		if (!client) {
			throw error(401, 'Invalid client credentials');
		}

		// Authenticate and issue token
		const accessToken = await authenticateScimClient(
			clientId.toString(),
			clientSecret.toString()
		);

		// Return token with actual client scopes
		const response = {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: client.accessTokenExpiresIn || 3600,
			scope: client.scopes.join(' ')
		};

		return json(response, {
			headers: {
				'Cache-Control': 'no-store',
				Pragma: 'no-cache'
			}
		});
	} catch (err: any) {
		console.error('Token endpoint error:', err);

		return json(
			{
				error: 'invalid_client',
				error_description: err.message || 'Authentication failed'
			},
			{
				status: err.status || 401,
				headers: {
					'WWW-Authenticate': 'Basic realm="SCIM OAuth 2.0"'
				}
			}
		);
	}
};
