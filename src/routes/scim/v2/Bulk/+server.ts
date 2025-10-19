/**
 * SCIM 2.0 Bulk Operations Endpoint
 * RFC 7644 Section 3.7
 *
 * Allows multiple operations in a single request for efficiency
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireScimAuthEnhanced, logScimRequest } from '$lib/scim/auth-enhanced';
import { identityRepository, orgUnitRepository } from '$lib/db/repositories';
import { employeeToScimUser, orgUnitToScimGroup, createScimError } from '$lib/scim/utils';
import { SCIM_SCHEMAS } from '$lib/scim/schemas';
import { ObjectId } from 'mongodb';

interface BulkOperation {
	method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	bulkId?: string; // Client-provided ID for this operation
	version?: string; // ETag for optimistic concurrency
	path: string; // e.g., "/Users", "/Users/123", "/Groups/456"
	data?: any; // Request body for POST/PUT/PATCH
}

interface BulkRequest {
	schemas: string[];
	failOnErrors?: number; // Stop after N errors (default: continue all)
	Operations: BulkOperation[];
}

interface BulkOperationResponse {
	method: string;
	bulkId?: string;
	version?: string;
	location?: string;
	response?: any;
	status: string; // HTTP status code as string
}

interface BulkResponse {
	schemas: string[];
	Operations: BulkOperationResponse[];
}

const MAX_OPERATIONS = 1000; // Maximum operations per bulk request
const MAX_PAYLOAD_SIZE = 1024 * 1024 * 10; // 10MB

/**
 * POST /scim/v2/Bulk
 * Process multiple SCIM operations in a single request
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const startTime = Date.now();
	let clientId = 'unknown';

	try {
		// Authenticate with 'bulk:operations' scope
		const auth = await requireScimAuthEnhanced(
			{ request, url, getClientAddress: () => '0.0.0.0' } as any,
			'bulk:operations'
		);
		clientId = auth.clientId;

		// Check payload size
		const contentLength = request.headers.get('content-length');
		if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
			throw error(
				413,
				JSON.stringify(
					createScimError(413, `Payload too large. Max ${MAX_PAYLOAD_SIZE} bytes`, undefined)
				)
			);
		}

		const bulkRequest: BulkRequest = await request.json();

		// Validate request
		if (!bulkRequest.schemas || !bulkRequest.schemas.includes(SCIM_SCHEMAS.BULK_REQUEST)) {
			throw error(
				400,
				JSON.stringify(createScimError(400, 'Invalid bulk request schema', 'invalidSyntax'))
			);
		}

		if (!bulkRequest.Operations || bulkRequest.Operations.length === 0) {
			throw error(
				400,
				JSON.stringify(createScimError(400, 'Operations array is required', 'invalidValue'))
			);
		}

		if (bulkRequest.Operations.length > MAX_OPERATIONS) {
			throw error(
				400,
				JSON.stringify(
					createScimError(
						400,
						`Too many operations. Max ${MAX_OPERATIONS} per request`,
						'tooMany'
					)
				)
			);
		}

		// Process operations
		const responses: BulkOperationResponse[] = [];
		let errorCount = 0;
		const failOnErrors = bulkRequest.failOnErrors || Infinity;

		for (const operation of bulkRequest.Operations) {
			try {
				const response = await processOperation(operation, url);
				responses.push(response);

				if (parseInt(response.status) >= 400) {
					errorCount++;
					if (errorCount >= failOnErrors) {
						// Stop processing remaining operations
						break;
					}
				}
			} catch (err: any) {
				errorCount++;
				responses.push({
					method: operation.method,
					bulkId: operation.bulkId,
					status: '500',
					response: {
						schemas: [SCIM_SCHEMAS.ERROR],
						detail: err.message || 'Internal server error',
						status: 500
					}
				});

				if (errorCount >= failOnErrors) {
					break;
				}
			}
		}

		const bulkResponse: BulkResponse = {
			schemas: [SCIM_SCHEMAS.BULK_RESPONSE],
			Operations: responses
		};

		// Log bulk request
		await logScimRequest({
			clientId,
			endpoint: '/scim/v2/Bulk',
			method: 'POST',
			statusCode: 200,
			ipAddress: url.hostname,
			duration: Date.now() - startTime
		});

		return json(bulkResponse, {
			headers: {
				'Content-Type': 'application/scim+json'
			}
		});
	} catch (err: any) {
		console.error('SCIM Bulk error:', err);

		await logScimRequest({
			clientId,
			endpoint: '/scim/v2/Bulk',
			method: 'POST',
			statusCode: err.status || 500,
			ipAddress: url.hostname,
			duration: Date.now() - startTime,
			errorMessage: err.message
		});

		if (err.status) {
			throw err;
		}

		throw error(
			500,
			JSON.stringify(createScimError(500, 'Bulk operation failed', undefined))
		);
	}
};

/**
 * Process a single bulk operation
 */
async function processOperation(
	operation: BulkOperation,
	url: URL
): Promise<BulkOperationResponse> {
	const baseUrl = `${url.protocol}//${url.host}`;

	try {
		// Parse path to determine resource type and ID
		const pathMatch = operation.path.match(/^\/(Users|Groups)(?:\/(.+))?$/);

		if (!pathMatch) {
			return {
				method: operation.method,
				bulkId: operation.bulkId,
				status: '400',
				response: {
					schemas: [SCIM_SCHEMAS.ERROR],
					detail: `Invalid path: ${operation.path}`,
					status: 400
				}
			};
		}

		const [, resourceType, resourceId] = pathMatch;

		// Execute operation based on method and resource type
		if (resourceType === 'Users') {
			return await processUserOperation(operation, resourceId, baseUrl);
		} else if (resourceType === 'Groups') {
			return await processGroupOperation(operation, resourceId, baseUrl);
		}

		throw new Error('Unsupported resource type');
	} catch (err: any) {
		return {
			method: operation.method,
			bulkId: operation.bulkId,
			status: err.status?.toString() || '500',
			response: {
				schemas: [SCIM_SCHEMAS.ERROR],
				detail: err.message || 'Operation failed',
				status: err.status || 500
			}
		};
	}
}

/**
 * Process User operation
 */
async function processUserOperation(
	operation: BulkOperation,
	resourceId: string | undefined,
	baseUrl: string
): Promise<BulkOperationResponse> {
	switch (operation.method) {
		case 'POST': {
			// Create user
			const newEmployee = await identityRepository.create({
				employeeId: operation.data.externalId || `EMP-${Date.now()}`,
				firstName: operation.data.name?.givenName || '',
				lastName: operation.data.name?.familyName || '',
				email: operation.data.emails?.[0]?.value || operation.data.userName,
				status: operation.data.active ? 'active' : 'inactive',
				createdAt: new Date(),
				updatedAt: new Date()
			} as any);

			const scimUser = await employeeToScimUser(newEmployee, baseUrl);

			return {
				method: 'POST',
				bulkId: operation.bulkId,
				status: '201',
				location: `${baseUrl}/scim/v2/Users/${newEmployee._id}`,
				response: scimUser
			};
		}

		case 'PUT': {
			// Full update
			if (!resourceId || !ObjectId.isValid(resourceId)) {
				throw new Error('Invalid user ID');
			}

			const updatedEmployee = await identityRepository.update(resourceId, {
				firstName: operation.data.name?.givenName,
				lastName: operation.data.name?.familyName,
				email: operation.data.emails?.[0]?.value,
				status: operation.data.active ? 'active' : 'inactive'
			});

			if (!updatedEmployee) {
				throw new Error('User not found');
			}

			const scimUser = await employeeToScimUser(updatedEmployee, baseUrl);

			return {
				method: 'PUT',
				bulkId: operation.bulkId,
				status: '200',
				location: `${baseUrl}/scim/v2/Users/${resourceId}`,
				response: scimUser
			};
		}

		case 'PATCH': {
			// Partial update
			if (!resourceId || !ObjectId.isValid(resourceId)) {
				throw new Error('Invalid user ID');
			}

			const updates: any = {};

			for (const op of operation.data.Operations || []) {
				if (op.op === 'replace') {
					if (op.path === 'active') {
						updates.status = op.value ? 'active' : 'inactive';
					}
					// Add more path handlers as needed
				}
			}

			const updatedEmployee = await identityRepository.update(resourceId, updates);

			if (!updatedEmployee) {
				throw new Error('User not found');
			}

			const scimUser = await employeeToScimUser(updatedEmployee, baseUrl);

			return {
				method: 'PATCH',
				bulkId: operation.bulkId,
				status: '200',
				location: `${baseUrl}/scim/v2/Users/${resourceId}`,
				response: scimUser
			};
		}

		case 'DELETE': {
			// Delete (deactivate)
			if (!resourceId || !ObjectId.isValid(resourceId)) {
				throw new Error('Invalid user ID');
			}

			await identityRepository.update(resourceId, { status: 'terminated' });

			return {
				method: 'DELETE',
				bulkId: operation.bulkId,
				status: '204'
			};
		}

		default:
			throw new Error(`Unsupported method: ${operation.method}`);
	}
}

/**
 * Process Group operation
 */
async function processGroupOperation(
	operation: BulkOperation,
	resourceId: string | undefined,
	baseUrl: string
): Promise<BulkOperationResponse> {
	switch (operation.method) {
		case 'POST': {
			// Create group
			const newOrgUnit = await orgUnitRepository.create({
				code: operation.data.externalId || `OU-${Date.now()}`,
				name: operation.data.displayName,
				type: operation.data['x-orgUnit']?.unitType || 'department',
				level: operation.data['x-orgUnit']?.level || 1,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			} as any);

			const scimGroup = await orgUnitToScimGroup(newOrgUnit, baseUrl);

			return {
				method: 'POST',
				bulkId: operation.bulkId,
				status: '201',
				location: `${baseUrl}/scim/v2/Groups/${newOrgUnit._id}`,
				response: scimGroup
			};
		}

		case 'PUT':
		case 'PATCH': {
			// Update group
			if (!resourceId || !ObjectId.isValid(resourceId)) {
				throw new Error('Invalid group ID');
			}

			const updates: any = {
				name: operation.data.displayName
			};

			const updatedOrgUnit = await orgUnitRepository.update(resourceId, updates);

			if (!updatedOrgUnit) {
				throw new Error('Group not found');
			}

			const scimGroup = await orgUnitToScimGroup(updatedOrgUnit, baseUrl);

			return {
				method: operation.method,
				bulkId: operation.bulkId,
				status: '200',
				location: `${baseUrl}/scim/v2/Groups/${resourceId}`,
				response: scimGroup
			};
		}

		case 'DELETE': {
			// Delete group
			if (!resourceId || !ObjectId.isValid(resourceId)) {
				throw new Error('Invalid group ID');
			}

			await orgUnitRepository.update(resourceId, { isActive: false });

			return {
				method: 'DELETE',
				bulkId: operation.bulkId,
				status: '204'
			};
		}

		default:
			throw new Error(`Unsupported method: ${operation.method}`);
	}
}
