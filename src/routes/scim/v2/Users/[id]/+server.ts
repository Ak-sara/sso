/**
 * SCIM 2.0 Users Endpoint - Single Resource
 * RFC 7644 - GET /Users/{id}, PUT /Users/{id}, PATCH /Users/{id}, DELETE /Users/{id}
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { useLogger } from '@ak-sara/fbao/foundation';
import { requireScimAuthEnhanced } from '$lib/scim/auth-enhanced';
import { db } from '$lib/db/db';
import { employeeToScimUser, createScimError } from '$lib/scim/utils';
import type { ScimUser, ScimPatchRequest } from '$lib/scim/schemas';

const log = useLogger({ module: 'scim:users' });

/**
 * GET /scim/v2/Users/{id}
 * Get a single user by ID
 */
export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'read:users');

		const { params, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		// Get employee
		const employee = await db.identities.findById(id);

		if (!employee) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		// Convert to SCIM
		const baseUrl = `${url.protocol}//${url.host}`;
		const scimUser = await employeeToScimUser(employee, baseUrl);

		return json(scimUser, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		log.error('SCIM Users GET (single) error', { error: err });

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
 * PUT /scim/v2/Users/{id}
 * Replace a user (full update)
 */
export const PUT: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'write:users');

		const { params, locals, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		const scimUser: ScimUser = locals.body as ScimUser;

		// Get existing employee
		const existingEmployee = await db.identities.findById(id);
		if (!existingEmployee) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		// Map SCIM user to employee update
		const enterpriseUser =
			scimUser['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];

		const updates: any = {
			firstName: scimUser.name?.givenName || existingEmployee.firstName,
			lastName: scimUser.name?.familyName || existingEmployee.lastName,
			email: scimUser.emails?.[0]?.value || existingEmployee.email,
			phone: scimUser.phoneNumbers?.[0]?.value || existingEmployee.phone,
			employmentStatus: scimUser.active ? 'active' : 'terminated'
		};

		// Update org unit / position if provided
		if (enterpriseUser?.department) {
			updates.orgUnitId = enterpriseUser.department;
			if (scimUser['x-position']?.id) {
				updates.positionId = scimUser['x-position'].id;
			}
		}

		// Update employee
		const didUpdate = await db.identities.updateById(id, updates);
		if (!didUpdate) {
			throw error(
				500,
				JSON.stringify(createScimError(500, 'Failed to update user', undefined))
			);
		}
		const updatedEmployee = await db.identities.findById(id);
		if (!updatedEmployee) {
			throw error(500, JSON.stringify(createScimError(500, 'Failed to fetch updated user', undefined)));
		}

		// Convert back to SCIM
		const baseUrl = `${url.protocol}//${url.host}`;
		const responseUser = await employeeToScimUser(updatedEmployee, baseUrl);

		return json(responseUser, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		log.error('SCIM Users PUT error', { error: err });

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
 * PATCH /scim/v2/Users/{id}
 * Partial update of a user
 */
export const PATCH: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'write:users');

		const { params, locals, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		const patchRequest: ScimPatchRequest = locals.body as ScimPatchRequest;

		// Get existing employee
		const existingEmployee = await db.identities.findById(id);
		if (!existingEmployee) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		const updates: any = {};

		// Process patch operations
		for (const op of patchRequest.Operations) {
			if (op.op === 'replace') {
				if (op.path === 'active') {
					updates.isActive = !!op.value;
					updates.employmentStatus = op.value ? 'active' : 'terminated';
				} else if (op.path === 'name.givenName') {
					updates.firstName = op.value;
				} else if (op.path === 'name.familyName') {
					updates.lastName = op.value;
				} else if (
					op.path ===
					'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department'
				) {
					updates.orgUnitId = op.value;
				}
			} else if (op.op === 'add') {
				if (op.path === 'emails') {
					updates.email = Array.isArray(op.value) ? op.value[0]?.value : op.value?.value;
				}
			}
		}

		// Update employee
		const didUpdate = await db.identities.updateById(id, updates);
		if (!didUpdate) {
			throw error(
				500,
				JSON.stringify(createScimError(500, 'Failed to update user', undefined))
			);
		}
		const updatedEmployee = await db.identities.findById(id);
		if (!updatedEmployee) {
			throw error(500, JSON.stringify(createScimError(500, 'Failed to fetch updated user', undefined)));
		}

		// Convert back to SCIM
		const baseUrl = `${url.protocol}//${url.host}`;
		const responseUser = await employeeToScimUser(updatedEmployee, baseUrl);

		return json(responseUser, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		log.error('SCIM Users PATCH error', { error: err });

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
 * DELETE /scim/v2/Users/{id}
 * Delete a user (deactivate employee)
 */
export const DELETE: RequestHandler = async (event) => {
	try {
		// Authenticate with OAuth 2.0
		await requireScimAuthEnhanced(event, 'delete:users');

		const { params, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		// Instead of hard delete, we deactivate
		const didDeactivate = await db.identities.updateById(id, {
			employmentStatus: 'terminated',
			isActive: false
		} as any);

		if (!didDeactivate) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		return new Response(null, { status: 204 });
	} catch (err: any) {
		log.error('SCIM Users DELETE error', { error: err });

		if (err.status) {
			throw err;
		}

		throw error(
			500,
			JSON.stringify(createScimError(500, 'Internal server error', undefined))
		);
	}
};
