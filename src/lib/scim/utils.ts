/**
 * SCIM 2.0 Utility Functions
 * Helper functions for SCIM resource mapping and queries
 */

import type { ObjectId } from 'mongodb';
import type { Identity, OrgUnit, Position } from '$lib/db/schemas';
import type {
	ScimUser,
	ScimGroup,
	ScimMeta,
	ScimError,
	ScimGroupMember,
	ScimEnterpriseUser,
	ScimPosition,
	ScimOrgUnit
} from './schemas';
import { SCIM_SCHEMAS, SCIM_ERROR_TYPES } from './schemas';
import { identityRepository, orgUnitRepository, positionRepository } from '$lib/db/repositories';

/**
 * Create SCIM meta object
 */
export function createScimMeta(
	resourceType: string,
	created?: Date,
	updated?: Date,
	id?: string,
	baseUrl?: string
): ScimMeta {
	const meta: ScimMeta = {
		resourceType
	};

	if (created) meta.created = created.toISOString();
	if (updated) meta.lastModified = updated.toISOString();
	if (id && baseUrl) meta.location = `${baseUrl}/${id}`;

	return meta;
}

/**
 * Create SCIM error response
 */
export function createScimError(
	status: number,
	detail?: string,
	scimType?: string
): ScimError {
	return {
		schemas: [SCIM_SCHEMAS.ERROR],
		status,
		scimType,
		detail
	};
}

/**
 * Get manager ID for an org unit
 * Finds the employee in the unit who has a manager position
 */
export async function getUnitManagerId(unitId: ObjectId | string): Promise<string | undefined> {
	const unitIdStr = unitId.toString();

	// Find all employees in this unit
	const employees = await identityRepository.findByUnit(unitIdStr);

	// Find the one with manager position
	for (const emp of employees) {
		if (emp.assignment?.positionId) {
			const position = await positionRepository.findById(
				emp.assignment.positionId.toString()
			);
			if (position?.isManager) {
				return emp._id?.toString();
			}
		}
	}

	return undefined;
}

/**
 * Get direct manager ID for an employee
 * Looks up the hierarchy to find the manager of the employee's unit
 */
export async function getEmployeeManagerId(employee: Identity): Promise<string | undefined> {
	if (!employee.assignment?.unitId) return undefined;

	return await getUnitManagerId(employee.assignment.unitId);
}

/**
 * Get all members (employees) of an org unit
 */
export async function getUnitMembers(unitId: ObjectId | string): Promise<ScimGroupMember[]> {
	const unitIdStr = unitId.toString();
	const employees = await identityRepository.findByUnit(unitIdStr);

	return employees.map((emp) => ({
		value: emp._id?.toString() || '',
		$ref: `/scim/v2/Users/${emp._id?.toString()}`,
		type: 'User' as const,
		display: `${emp.firstName} ${emp.lastName}`
	}));
}

/**
 * Convert Identity (employee type) to SCIM User
 */
export async function employeeToScimUser(
	employee: Identity,
	baseUrl?: string
): Promise<ScimUser> {
	const id = employee._id?.toString() || '';

	// Get manager
	const managerId = await getEmployeeManagerId(employee);
	const enterpriseUser: ScimEnterpriseUser = {
		employeeNumber: employee.employeeId,
		department: employee.assignment?.unitId?.toString()
	};

	if (managerId) {
		enterpriseUser.manager = {
			value: managerId,
			$ref: `${baseUrl}/scim/v2/Users/${managerId}`
		};
	}

	// Get position info
	let positionData: ScimPosition | undefined;
	if (employee.assignment?.positionId) {
		const position = await positionRepository.findById(
			employee.assignment.positionId.toString()
		);
		if (position) {
			positionData = {
				id: position._id?.toString() || '',
				name: position.name,
				isManager: position.isManager || false,
				level: position.level
			};
		}
	}

	// Get org unit info
	let orgUnitData: { id: string; name: string } | undefined;
	if (employee.assignment?.unitId) {
		const orgUnit = await orgUnitRepository.findById(employee.assignment.unitId.toString());
		if (orgUnit) {
			orgUnitData = {
				id: orgUnit._id?.toString() || '',
				name: orgUnit.name
			};
		}
	}

	const scimUser: ScimUser = {
		schemas: [SCIM_SCHEMAS.USER, SCIM_SCHEMAS.ENTERPRISE_USER],
		id,
		externalId: employee.employeeId,
		userName: employee.email || `${employee.employeeId}@example.com`,
		name: {
			givenName: employee.firstName,
			familyName: employee.lastName,
			formatted: `${employee.firstName} ${employee.lastName}`
		},
		displayName: `${employee.firstName} ${employee.lastName}`,
		active: employee.status === 'active',
		emails: employee.email
			? [
					{
						value: employee.email,
						primary: true,
						type: 'work'
					}
				]
			: undefined,
		phoneNumbers: employee.phoneNumber
			? [
					{
						value: employee.phoneNumber,
						primary: true,
						type: 'work'
					}
				]
			: undefined,
		meta: createScimMeta(
			'User',
			employee.createdAt,
			employee.updatedAt,
			id,
			baseUrl ? `${baseUrl}/scim/v2/Users` : undefined
		),
		'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': enterpriseUser
	};

	if (positionData) {
		scimUser['x-position'] = positionData;
	}

	if (orgUnitData) {
		scimUser['x-orgUnit'] = orgUnitData;
	}

	return scimUser;
}

/**
 * Convert OrgUnit to SCIM Group
 */
export async function orgUnitToScimGroup(
	orgUnit: OrgUnit,
	baseUrl?: string
): Promise<ScimGroup> {
	const id = orgUnit._id?.toString() || '';

	// Get members
	const members = await getUnitMembers(orgUnit._id!);

	// Get manager
	const managerId = await getUnitManagerId(orgUnit._id!);

	const orgUnitData: ScimOrgUnit = {
		unitType: orgUnit.type,
		level: orgUnit.level,
		parentUnitId: orgUnit.parentId?.toString(),
		managerId
	};

	const scimGroup: ScimGroup = {
		schemas: [SCIM_SCHEMAS.GROUP],
		id,
		externalId: orgUnit.code,
		displayName: orgUnit.name,
		members: members.length > 0 ? members : undefined,
		meta: createScimMeta(
			'Group',
			orgUnit.createdAt,
			orgUnit.updatedAt,
			id,
			baseUrl ? `${baseUrl}/scim/v2/Groups` : undefined
		),
		'x-orgUnit': orgUnitData
	};

	return scimGroup;
}

/**
 * Parse SCIM filter query (basic implementation)
 * Example: userName eq "john.doe@example.com"
 */
export function parseScimFilter(filter: string): Record<string, any> {
	// Basic implementation - just handle simple eq filters
	// For production, use a proper SCIM filter parser

	const match = filter.match(/(\w+)\s+eq\s+"([^"]+)"/);
	if (!match) {
		throw new Error('Invalid filter syntax');
	}

	const [, attribute, value] = match;

	// Map SCIM attributes to database fields
	const attributeMap: Record<string, string> = {
		userName: 'email',
		externalId: 'employeeId',
		displayName: 'firstName', // Partial match
		active: 'status'
	};

	const dbField = attributeMap[attribute] || attribute;

	if (attribute === 'active') {
		return { status: value === 'true' ? 'active' : { $ne: 'active' } };
	}

	return { [dbField]: value };
}

/**
 * Get pagination parameters from SCIM query
 */
export function getScimPaginationParams(url: URL) {
	const startIndex = parseInt(url.searchParams.get('startIndex') || '1');
	const count = parseInt(url.searchParams.get('count') || '100');

	// SCIM uses 1-based indexing, MongoDB uses 0-based
	const skip = Math.max(0, startIndex - 1);
	const limit = Math.min(count, 1000); // Max 1000 results

	return { skip, limit, startIndex, count };
}
