/**
 * SCIM 2.0 Groups Endpoint
 * RFC 7644 - GET /Groups
 * Groups represent organizational units in our system
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireScimAuthEnhanced } from '$lib/scim/auth-enhanced';
import { orgUnitRepository } from '$lib/db/repositories';
import { orgUnitToScimGroup, createScimError, getScimPaginationParams } from '$lib/scim/utils';
import { SCIM_SCHEMAS } from '$lib/scim/schemas';
import type { ScimListResponse, ScimGroup } from '$lib/scim/schemas';

/**
 * GET /scim/v2/Groups
 * List all groups (organizational units) with optional filtering and pagination
 */
export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'read:groups');

		const { url } = event;

		// Get base URL for resource locations
		const baseUrl = `${url.protocol}//${url.host}`;

		// Parse pagination
		const { skip, limit, startIndex } = getScimPaginationParams(url);

		// Parse filter (basic implementation)
		const filterParam = url.searchParams.get('filter');
		let query: any = {};

		if (filterParam) {
			// Simple filter: displayName eq "Unit Name"
			const match = filterParam.match(/displayName\s+eq\s+"([^"]+)"/i);
			if (match) {
				query.name = match[1];
			}
		}

		// Get org units
		const allOrgUnits = await orgUnitRepository.getAll();

		// Apply filter
		const filteredOrgUnits = filterParam
			? allOrgUnits.filter((unit) => {
					if (query.name && unit.name !== query.name) return false;
					return true;
				})
			: allOrgUnits;

		const totalResults = filteredOrgUnits.length;
		const paginatedOrgUnits = filteredOrgUnits.slice(skip, skip + limit);

		// Convert to SCIM groups
		const scimGroups = await Promise.all(
			paginatedOrgUnits.map((unit) => orgUnitToScimGroup(unit, baseUrl))
		);

		const response: ScimListResponse<ScimGroup> = {
			schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
			totalResults,
			startIndex,
			itemsPerPage: scimGroups.length,
			Resources: scimGroups
		};

		return json(response, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		console.error('SCIM Groups GET error:', err);

		if (err.status) {
			throw err;
		}

		throw error(
			500,
			JSON.stringify(createScimError(500, 'Internal server error', undefined))
		);
	}
};

/**
 * POST /scim/v2/Groups
 * Create a new group (organizational unit)
 */
export const POST: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'write:groups');

		const { request, url } = event;

		const scimGroup: ScimGroup = await request.json();

		// Validate required fields
		if (!scimGroup.displayName) {
			throw error(
				400,
				JSON.stringify(
					createScimError(400, 'Missing required field: displayName', 'invalidValue')
				)
			);
		}

		const orgUnitData = scimGroup['x-orgUnit'];

		// Map SCIM group to org unit (using canonical field names)
		const newOrgUnit = {
			code: scimGroup.externalId || `OU-${Date.now()}`,
			name: scimGroup.displayName,
			type: orgUnitData?.type || 'department', // CANONICAL: use 'type' not 'unitType'
			level: orgUnitData?.level || 1,
			parentId: orgUnitData?.parentUnitId || null,
			isActive: true
		};

		// Create org unit
		const createdOrgUnit = await orgUnitRepository.create(newOrgUnit as any);

		// Convert back to SCIM
		const baseUrl = `${url.protocol}//${url.host}`;
		const responseGroup = await orgUnitToScimGroup(createdOrgUnit, baseUrl);

		return json(responseGroup, {
			status: 201,
			headers: {
				'Content-Type': 'application/scim+json',
				Location: `${baseUrl}/scim/v2/Groups/${createdOrgUnit._id}`
			}
		});
	} catch (err: any) {
		console.error('SCIM Groups POST error:', err);

		if (err.status) {
			throw err;
		}

		throw error(
			500,
			JSON.stringify(createScimError(500, 'Internal server error', undefined))
		);
	}
};
