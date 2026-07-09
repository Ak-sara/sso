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
import { db } from '$lib/db/db';
import { findIdentitiesByOrgUnit } from '$lib/db/schemas';

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
	const employees = await findIdentitiesByOrgUnit(unitIdStr);

	// Find the one with manager position
	for (const emp of employees) {
		if (emp.positionId) {
			const position = await db.positions.findById(
				emp.positionId.toString()
			);
			if (position?.level === 'executive' || position?.level === 'senior') {
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
	if (!employee.orgUnitId) return undefined;

	return await getUnitManagerId(employee.orgUnitId);
}

/**
 * Get all members (employees) of an org unit
 */
export async function getUnitMembers(unitId: ObjectId | string): Promise<ScimGroupMember[]> {
	const unitIdStr = unitId.toString();
	const employees = await findIdentitiesByOrgUnit(unitIdStr);

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
		department: employee.orgUnitId?.toString()
	};

	if (managerId) {
		enterpriseUser.manager = {
			value: managerId,
			$ref: `${baseUrl}/scim/v2/Users/${managerId}`
		};
	}

	// Get position info
	let positionData: ScimPosition | undefined;
	if (employee.positionId) {
		const position = await db.positions.findById(
			employee.positionId.toString()
		);
		if (position) {
			positionData = {
				id: position._id?.toString() || '',
				name: position.name,
				isManager: false,
				level: position.level as any
			};
		}
	}

	// Get org unit info
	let orgUnitData: { id: string; name: string } | undefined;
	if (employee.orgUnitId) {
		const orgUnit = await db.orgUnits.findById(employee.orgUnitId.toString());
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
		active: employee.employmentStatus === 'active',
		emails: employee.email
			? [
					{
						value: employee.email,
						primary: true,
						type: 'work'
					}
				]
			: undefined,
		phoneNumbers: employee.phone
			? [
					{
						value: employee.phone,
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

export type ScimFilterCondition = { field: string; op: string; value: string };

const SCIM_ATTR_MAP: Record<string, string> = {
	userName: 'email',
	'emails.value': 'email',
	'name.givenName': 'firstName',
	'name.familyName': 'lastName',
	displayName: 'fullName',
	externalId: 'employeeId',
	active: 'isActive',
};

/**
 * Parse SCIM filter into conditions list.
 * Supports: eq, co, sw, ew — joined by 'or'.
 * Examples:
 *   userName eq "john@example.com"
 *   displayName co "Smith" or userName co "smith"
 */
export function parseScimFilter(filter: string): ScimFilterCondition[] {
	const parts = filter.split(/\s+or\s+/i);
	return parts.map((part) => {
		const match = part.trim().match(/([\w.]+)\s+(eq|co|sw|ew)\s+"([^"]*)"/i);
		if (!match) throw new Error(`Invalid filter syntax: ${part.trim()}`);
		const [, attr, op, value] = match;
		return { field: SCIM_ATTR_MAP[attr] ?? attr, op: op.toLowerCase(), value };
	});
}

/**
 * Evaluate parsed SCIM filter conditions against a single identity document.
 * Conditions are ORed together.
 */
export function matchesScimFilter(identity: any, conditions: ScimFilterCondition[]): boolean {
	return conditions.some(({ field, op, value }) => {
		const raw = identity[field];
		const fieldVal = raw == null ? '' : String(raw).toLowerCase();
		const v = value.toLowerCase();
		switch (op) {
			case 'eq': return fieldVal === v;
			case 'co': return fieldVal.includes(v);
			case 'sw': return fieldVal.startsWith(v);
			case 'ew': return fieldVal.endsWith(v);
			default:   return false;
		}
	});
}

/**
 * Get pagination parameters from SCIM query
 */
export function getScimPaginationParams(locals: App.Locals) {
	const startIndex = parseInt(locals.query?.startIndex || '1');
	const count = parseInt(locals.query?.count || '100');

	// SCIM uses 1-based indexing, MongoDB uses 0-based
	const skip = Math.max(0, startIndex - 1);
	const limit = Math.min(count, 1000); // Max 1000 results

	return { skip, limit, startIndex, count };
}
