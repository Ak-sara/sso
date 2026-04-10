/**
 * SCIM 2.0 Resource Types Endpoint
 * RFC 7643 Section 6
 *
 * Describes the types of resources available (User, Group, etc.)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /scim/v2/ResourceTypes
 * Returns all supported resource types
 */
export const GET: RequestHandler = async ({ url }) => {
	const baseUrl = `${url.protocol}//${url.host}`;

	const resourceTypes = [
		{
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
			id: 'User',
			name: 'User',
			endpoint: '/scim/v2/Users',
			description: 'SCIM User Resource - Represents employees in the organization',
			schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
			schemaExtensions: [
				{
					schema: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
					required: false
				}
			],
			meta: {
				resourceType: 'ResourceType',
				location: `${baseUrl}/scim/v2/ResourceTypes/User`
			}
		},
		{
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
			id: 'Group',
			name: 'Group',
			endpoint: '/scim/v2/Groups',
			description:
				'SCIM Group Resource - Represents organizational units with hierarchical structure',
			schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
			schemaExtensions: [],
			meta: {
				resourceType: 'ResourceType',
				location: `${baseUrl}/scim/v2/ResourceTypes/Group`
			}
		}
	];

	return json(
		{
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults: resourceTypes.length,
			Resources: resourceTypes
		},
		{
			headers: {
				'Content-Type': 'application/scim+json'
			}
		}
	);
};
