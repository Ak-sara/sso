/**
 * SCIM 2.0 Service Provider Configuration
 * RFC 7643 Section 5
 *
 * This endpoint describes the SCIM capabilities supported by this server.
 * Clients can query this to understand what features are available.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /scim/v2/ServiceProviderConfig
 * Returns server capabilities (no authentication required per RFC)
 */
export const GET: RequestHandler = async ({ url }) => {
	const baseUrl = `${url.protocol}//${url.host}`;

	const config = {
		schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
		documentationUri: `${baseUrl}/docs/scim`,

		// PATCH support
		patch: {
			supported: true
		},

		// Bulk operations support
		bulk: {
			supported: true,
			maxOperations: 1000,
			maxPayloadSize: 10485760 // 10MB in bytes
		},

		// Filter support
		filter: {
			supported: true,
			maxResults: 1000
		},

		// Change password support
		changePassword: {
			supported: false // Not applicable for employee provisioning
		},

		// Sort support
		sort: {
			supported: true
		},

		// ETag support for concurrency
		etag: {
			supported: false // TODO: Implement ETags for optimistic locking
		},

		// Authentication schemes
		authenticationSchemes: [
			{
				type: 'oauthbearertoken',
				name: 'OAuth 2.0 Bearer Token',
				description: 'OAuth 2.0 Client Credentials Grant with JWT tokens',
				specUri: 'https://tools.ietf.org/html/rfc6750',
				documentationUri: `${baseUrl}/docs/scim/authentication`,
				primary: true
			},
			{
				type: 'oauth2',
				name: 'OAuth 2.0',
				description: 'OAuth 2.0 framework for authorization',
				specUri: 'https://tools.ietf.org/html/rfc6749',
				documentationUri: `${baseUrl}/docs/scim/oauth`,
				primary: true
			}
		],

		// Metadata
		meta: {
			resourceType: 'ServiceProviderConfig',
			location: `${baseUrl}/scim/v2/ServiceProviderConfig`,
			version: '2.0'
		}
	};

	return json(config, {
		headers: {
			'Content-Type': 'application/scim+json'
		}
	});
};
