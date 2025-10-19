/**
 * SCIM 2.0 Users Endpoint
 * RFC 7644 - GET /Users
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireScimAuthEnhanced } from '$lib/scim/auth-enhanced';
import { employeeRepository } from '$lib/db/repositories';
import {
	employeeToScimUser,
	createScimError,
	parseScimFilter,
	getScimPaginationParams
} from '$lib/scim/utils';
import { SCIM_SCHEMAS } from '$lib/scim/schemas';
import type { ScimListResponse, ScimUser } from '$lib/scim/schemas';

/**
 * GET /scim/v2/Users
 * List all users with optional filtering and pagination
 */
export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'read:users');

		const { url } = event;

		// Get base URL for resource locations
		const baseUrl = `${url.protocol}//${url.host}`;

		// Parse pagination
		const { skip, limit, startIndex } = getScimPaginationParams(url);

		// Parse filter
		const filterParam = url.searchParams.get('filter');
		let query: any = {};

		if (filterParam) {
			try {
				query = parseScimFilter(filterParam);
			} catch (err) {
				throw error(
					400,
					JSON.stringify(createScimError(400, 'Invalid filter syntax', 'invalidFilter'))
				);
			}
		}

		// Get employees
		const allEmployees = await employeeRepository.getAll();
		const filteredEmployees = filterParam
			? allEmployees.filter((emp) => {
					// Apply filter manually (basic implementation)
					for (const [key, value] of Object.entries(query)) {
						if ((emp as any)[key] !== value) return false;
					}
					return true;
				})
			: allEmployees;

		const totalResults = filteredEmployees.length;
		const paginatedEmployees = filteredEmployees.slice(skip, skip + limit);

		// Convert to SCIM users
		const scimUsers = await Promise.all(
			paginatedEmployees.map((emp) => employeeToScimUser(emp, baseUrl))
		);

		const response: ScimListResponse<ScimUser> = {
			schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
			totalResults,
			startIndex,
			itemsPerPage: scimUsers.length,
			Resources: scimUsers
		};

		return json(response, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		console.error('SCIM Users GET error:', err);

		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(
			500,
			JSON.stringify(createScimError(500, 'Internal server error', undefined))
		);
	}
};

/**
 * POST /scim/v2/Users
 * Create a new user (employee onboarding via SCIM)
 */
export const POST: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'write:users');

		const { request, url } = event;

		const scimUser: ScimUser = await request.json();

		// Validate required fields
		if (!scimUser.userName || !scimUser.name?.givenName || !scimUser.name?.familyName) {
			throw error(
				400,
				JSON.stringify(
					createScimError(400, 'Missing required fields: userName, name.givenName, name.familyName', 'invalidValue')
				)
			);
		}

		// Map SCIM user to employee
		const enterpriseUser = scimUser['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];

		const newEmployee = {
			employeeId: scimUser.externalId || enterpriseUser?.employeeNumber || `EMP-${Date.now()}`,
			firstName: scimUser.name.givenName,
			lastName: scimUser.name.familyName,
			email: scimUser.emails?.[0]?.value || scimUser.userName,
			phoneNumber: scimUser.phoneNumbers?.[0]?.value,
			status: scimUser.active ? 'active' : 'inactive',
			assignment: enterpriseUser?.department
				? {
						unitId: enterpriseUser.department,
						positionId: scimUser['x-position']?.id
					}
				: undefined
		};

		// Create employee
		const createdEmployee = await employeeRepository.create(newEmployee as any);

		// Convert back to SCIM
		const baseUrl = `${url.protocol}//${url.host}`;
		const responseUser = await employeeToScimUser(createdEmployee, baseUrl);

		return json(responseUser, {
			status: 201,
			headers: {
				'Content-Type': 'application/scim+json',
				Location: `${baseUrl}/scim/v2/Users/${createdEmployee._id}`
			}
		});
	} catch (err: any) {
		console.error('SCIM Users POST error:', err);

		if (err.status) {
			throw err;
		}

		throw error(
			500,
			JSON.stringify(createScimError(500, 'Internal server error', undefined))
		);
	}
};
