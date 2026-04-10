/**
 * SCIM 2.0 Groups Endpoint - Single Resource
 * RFC 7644 - GET /Groups/{id}, PUT /Groups/{id}, PATCH /Groups/{id}, DELETE /Groups/{id}
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { useLogger } from '@ak-sara/fbao/foundation';
import { requireScimAuthEnhanced } from '$lib/scim/auth-enhanced';
import { db } from '$lib/db/db';
import { orgUnitToScimGroup, createScimError } from '$lib/scim/utils';
import type { ScimGroup, ScimPatchRequest } from '$lib/scim/schemas';

const log = useLogger({ module: 'scim:groups' });

/**
 * GET /scim/v2/Groups/{id}
 * Get a single group (org unit) by ID
 */
export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'read:groups');

		const { params, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `Group ${id} not found`, 'noTarget'))
			);
		}

		// Get org unit
		const orgUnit = await db.orgUnits.findById(id);

		if (!orgUnit) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `Group ${id} not found`, 'noTarget'))
			);
		}

		// Convert to SCIM
		const baseUrl = `${url.protocol}//${url.host}`;
		const scimGroup = await orgUnitToScimGroup(orgUnit, baseUrl);

		return json(scimGroup, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		log.error('SCIM Groups GET (single) error', { error: err });

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
 * PUT /scim/v2/Groups/{id}
 * Replace a group (full update)
 */
export const PUT: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'write:groups');

		const { params, locals, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `Group ${id} not found`, 'noTarget'))
			);
		}

		const scimGroup: ScimGroup = locals.body as ScimGroup;

		// Get existing org unit
		const existingOrgUnit = await db.orgUnits.findById(id);
		if (!existingOrgUnit) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `Group ${id} not found`, 'noTarget'))
			);
		}

		const orgUnitData = scimGroup['x-orgUnit'];

		// Map SCIM group to org unit update (using canonical field names)
		const updates: any = {
			name: scimGroup.displayName || existingOrgUnit.name,
			type: orgUnitData?.unitType || existingOrgUnit.type,
			level: orgUnitData?.level ?? existingOrgUnit.level,
			parentId: orgUnitData?.parentUnitId
				? new ObjectId(orgUnitData.parentUnitId)
				: existingOrgUnit.parentId
		};

		if (scimGroup.externalId) {
			updates.code = scimGroup.externalId;
		}

		// Update org unit
		const didUpdate = await db.orgUnits.updateById(id, updates);
		if (!didUpdate) {
			throw error(
				500,
				JSON.stringify(createScimError(500, 'Failed to update group', undefined))
			);
		}
		const updatedOrgUnit = await db.orgUnits.findById(id);
		if (!updatedOrgUnit) {
			throw error(500, JSON.stringify(createScimError(500, 'Failed to fetch updated group', undefined)));
		}

		// Convert back to SCIM
		const baseUrl = `${url.protocol}//${url.host}`;
		const responseGroup = await orgUnitToScimGroup(updatedOrgUnit, baseUrl);

		return json(responseGroup, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		log.error('SCIM Groups PUT error', { error: err });

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
 * PATCH /scim/v2/Groups/{id}
 * Partial update of a group
 */
export const PATCH: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'write:groups');

		const { params, locals, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `Group ${id} not found`, 'noTarget'))
			);
		}

		const patchRequest: ScimPatchRequest = locals.body as ScimPatchRequest;

		// Get existing org unit
		const existingOrgUnit = await db.orgUnits.findById(id);
		if (!existingOrgUnit) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `Group ${id} not found`, 'noTarget'))
			);
		}

		const updates: any = {};

		// Process patch operations
		for (const op of patchRequest.Operations) {
			if (op.op === 'replace') {
				if (op.path === 'displayName') {
					updates.name = op.value;
				} else if (op.path === 'x-orgUnit.type') {
					updates.type = op.value;
				} else if (op.path === 'x-orgUnit.parentUnitId') {
					updates.parentId = op.value ? new ObjectId(op.value) : null;
				} else if (op.path === 'x-orgUnit.level') {
					updates.level = op.value;
				}
			} else if (op.op === 'add') {
				// Handle member additions (not implemented for org units)
			} else if (op.op === 'remove') {
				// Handle member removals
			}
		}

		// Update org unit
		const didUpdate = await db.orgUnits.updateById(id, updates);
		if (!didUpdate) {
			throw error(
				500,
				JSON.stringify(createScimError(500, 'Failed to update group', undefined))
			);
		}
		const updatedOrgUnit = await db.orgUnits.findById(id);
		if (!updatedOrgUnit) {
			throw error(500, JSON.stringify(createScimError(500, 'Failed to fetch updated group', undefined)));
		}

		// Convert back to SCIM
		const baseUrl = `${url.protocol}//${url.host}`;
		const responseGroup = await orgUnitToScimGroup(updatedOrgUnit, baseUrl);

		return json(responseGroup, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		log.error('SCIM Groups PATCH error', { error: err });

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
 * DELETE /scim/v2/Groups/{id}
 * Delete a group (deactivate org unit)
 */
export const DELETE: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'delete:groups');

		const { params, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `Group ${id} not found`, 'noTarget'))
			);
		}

		// Instead of hard delete, we deactivate
		const didDeactivate = await db.orgUnits.updateById(id, {
			isActive: false
		} as any);

		if (!didDeactivate) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `Group ${id} not found`, 'noTarget'))
			);
		}

		return new Response(null, { status: 204 });
	} catch (err: any) {
		log.error('SCIM Groups DELETE error', { error: err });

		if (err.status) {
			throw err;
		}

		throw error(
			500,
			JSON.stringify(createScimError(500, 'Internal server error', undefined))
		);
	}
};
