/**
 * SCIM 2.0 Schemas Endpoint
 * RFC 7643 Section 7
 *
 * Describes the schema definitions for resources
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /scim/v2/Schemas
 * Returns all supported schemas
 */
export const GET: RequestHandler = async ({ url }) => {
	const baseUrl = `${url.protocol}//${url.host}`;

	const schemas = [
		{
			id: 'urn:ietf:params:scim:schemas:core:2.0:User',
			name: 'User',
			description: 'SCIM 2.0 User Schema',
			attributes: [
				{
					name: 'userName',
					type: 'string',
					multiValued: false,
					required: true,
					caseExact: false,
					mutability: 'readWrite',
					returned: 'default',
					uniqueness: 'server',
					description: 'Unique identifier for the User, typically used as login username'
				},
				{
					name: 'name',
					type: 'complex',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: "The components of the user's name",
					subAttributes: [
						{
							name: 'formatted',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Full name including all middle names, titles, and suffixes'
						},
						{
							name: 'familyName',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Family name of the User, or last name'
						},
						{
							name: 'givenName',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Given name of the User, or first name'
						}
					]
				},
				{
					name: 'displayName',
					type: 'string',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Name to display for the User'
				},
				{
					name: 'emails',
					type: 'complex',
					multiValued: true,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Email addresses for the user',
					subAttributes: [
						{
							name: 'value',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Email address'
						},
						{
							name: 'type',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Type of email address (work, home, other)'
						},
						{
							name: 'primary',
							type: 'boolean',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Indicates if this is the primary email'
						}
					]
				},
				{
					name: 'phoneNumbers',
					type: 'complex',
					multiValued: true,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Phone numbers for the user'
				},
				{
					name: 'active',
					type: 'boolean',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Whether the user account is active'
				},
				{
					name: 'externalId',
					type: 'string',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'External unique identifier for the user (employee ID)'
				}
			],
			meta: {
				resourceType: 'Schema',
				location: `${baseUrl}/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User`
			}
		},
		{
			id: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
			name: 'Enterprise User Extension',
			description: 'SCIM 2.0 Enterprise User Extension',
			attributes: [
				{
					name: 'employeeNumber',
					type: 'string',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Numeric or alphanumeric identifier assigned to a person'
				},
				{
					name: 'costCenter',
					type: 'string',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Cost center for the user'
				},
				{
					name: 'organization',
					type: 'string',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Organization the user belongs to'
				},
				{
					name: 'division',
					type: 'string',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Division the user belongs to'
				},
				{
					name: 'department',
					type: 'string',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Department or organizational unit ID'
				},
				{
					name: 'manager',
					type: 'complex',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: "User's manager",
					subAttributes: [
						{
							name: 'value',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Manager user ID'
						},
						{
							name: '$ref',
							type: 'reference',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'URI reference to the manager'
						},
						{
							name: 'displayName',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readOnly',
							returned: 'default',
							description: 'Manager display name'
						}
					]
				}
			],
			meta: {
				resourceType: 'Schema',
				location: `${baseUrl}/scim/v2/Schemas/urn:ietf:params:scim:schemas:extension:enterprise:2.0:User`
			}
		},
		{
			id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
			name: 'Group',
			description: 'SCIM 2.0 Group Schema',
			attributes: [
				{
					name: 'displayName',
					type: 'string',
					multiValued: false,
					required: true,
					mutability: 'readWrite',
					returned: 'default',
					description: 'Human-readable name for the Group'
				},
				{
					name: 'members',
					type: 'complex',
					multiValued: true,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'List of members in the Group',
					subAttributes: [
						{
							name: 'value',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Member user ID'
						},
						{
							name: '$ref',
							type: 'reference',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'URI reference to the member'
						},
						{
							name: 'type',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							description: 'Type of member (User or Group)'
						},
						{
							name: 'display',
							type: 'string',
							multiValued: false,
							required: false,
							mutability: 'readOnly',
							returned: 'default',
							description: 'Member display name'
						}
					]
				},
				{
					name: 'externalId',
					type: 'string',
					multiValued: false,
					required: false,
					mutability: 'readWrite',
					returned: 'default',
					description: 'External identifier for the Group (org unit code)'
				}
			],
			meta: {
				resourceType: 'Schema',
				location: `${baseUrl}/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group`
			}
		}
	];

	return json(
		{
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults: schemas.length,
			Resources: schemas
		},
		{
			headers: {
				'Content-Type': 'application/scim+json'
			}
		}
	);
};
