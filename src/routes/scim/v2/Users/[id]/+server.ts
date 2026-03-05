/**
 * SCIM 2.0 Users Endpoint - Single Resource
 * RFC 7644 - GET /Users/{id}, PUT /Users/{id}, PATCH /Users/{id}, DELETE /Users/{id}
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { requireScimAuthEnhanced } from '$lib/scim/auth-enhanced';
import { identityRepository, orgUnitRepository, positionRepository } from '$lib/db/repositories';
import { employeeToScimUser, createScimError } from '$lib/scim/utils';
import type { ScimUser, ScimPatchRequest } from '$lib/scim/schemas';

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
		const employee = await identityRepository.findById(id);

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
		console.error('SCIM Users GET (single) error:', err);

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

		const { params, request, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		const scimUser: ScimUser = await request.json();

		// Get existing employee
		const existingEmployee = await identityRepository.findById(id);
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
			phoneNumber: scimUser.phoneNumbers?.[0]?.value || existingEmployee.phoneNumber,
			status: scimUser.active ? 'active' : 'inactive'
		};

		// Update assignment if provided
		if (enterpriseUser?.department) {
			updates.assignment = {
				unitId: new ObjectId(enterpriseUser.department),
				positionId: scimUser['x-position']?.id
					? new ObjectId(scimUser['x-position'].id)
					: existingEmployee.assignment?.positionId
			};
		}

		// Update employee
		const updatedEmployee = await identityRepository.update(id, updates);

		if (!updatedEmployee) {
			throw error(
				500,
				JSON.stringify(createScimError(500, 'Failed to update user', undefined))
			);
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
		console.error('SCIM Users PUT error:', err);

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

		const { params, request, url } = event;

		const { id } = params;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		const patchRequest: ScimPatchRequest = await request.json();

		// Get existing employee
		const existingEmployee = await identityRepository.findById(id);
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
					updates.status = op.value ? 'active' : 'inactive';
				} else if (op.path === 'name.givenName') {
					updates.firstName = op.value;
				} else if (op.path === 'name.familyName') {
					updates.lastName = op.value;
				} else if (
					op.path ===
					'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department'
				) {
					if (!updates.assignment) updates.assignment = { ...existingEmployee.assignment };
					updates.assignment.unitId = new ObjectId(op.value);
				}
				// Add more path handlers as needed
			} else if (op.op === 'add') {
				// Handle add operations
				if (op.path === 'emails') {
					updates.email = Array.isArray(op.value) ? op.value[0]?.value : op.value?.value;
				}
			}
			// 'remove' operations can be added here
		}

		// Update employee
		const updatedEmployee = await identityRepository.update(id, updates);

		if (!updatedEmployee) {
			throw error(
				500,
				JSON.stringify(createScimError(500, 'Failed to update user', undefined))
			);
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
		console.error('SCIM Users PATCH error:', err);

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
		const updatedEmployee = await identityRepository.update(id, {
			status: 'terminated'
		});

		if (!updatedEmployee) {
			throw error(
				404,
				JSON.stringify(createScimError(404, `User ${id} not found`, 'noTarget'))
			);
		}

		return new Response(null, { status: 204 });
	} catch (err: any) {
		console.error('SCIM Users DELETE error:', err);

		if (err.status) {
			throw err;
		}

		throw error(
			500,
			JSON.stringify(createScimError(500, 'Internal server error', undefined))
		);
	}
};
