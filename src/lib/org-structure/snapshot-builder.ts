import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import type {
	OrgStructureSnapshot,
	SnapshotOrgUnit,
	SnapshotPosition,
	SnapshotEmployee
} from './types';

/**
 * Build full denormalized snapshot of current org structure
 * Called when creating/publishing a new version
 *
 * This captures the complete state at a point in time:
 * - All org units with resolved data
 * - All positions
 * - All active employees with fully denormalized assignments
 */
export async function buildOrgStructureSnapshot(
	organizationId: string
): Promise<OrgStructureSnapshot> {
	const db = getDB();
	const now = new Date();

	console.log(`Building snapshot for organization: ${organizationId}`);

	// Query live collections
	const [orgUnits, positions, identities] = await Promise.all([
		db.collection('org_units')
			.find({ organizationId: new ObjectId(organizationId) })
			.toArray(),

		db.collection('positions')
			.find({ organizationId: new ObjectId(organizationId) })
			.toArray(),

		db.collection('identities')
			.find({
				organizationId,
				identityType: 'employee',
				employmentStatus: { $in: ['active', 'probation'] }
			})
			.toArray()
	]);

	console.log(`Found: ${orgUnits.length} org units, ${positions.length} positions, ${identities.length} employees`);

	// Denormalize org units
	const snapshotOrgUnits: SnapshotOrgUnit[] = orgUnits.map(u => ({
		_id: u._id.toString(),
		code: u.code,
		name: u.name,
		parentId: u.parentId?.toString(),
		type: u.type,
		level: u.level || 0,
		sortOrder: u.sortOrder || 0,
		headEmployeeId: u.managerId?.toString()
	}));

	// Denormalize positions
	const snapshotPositions: SnapshotPosition[] = positions.map(p => ({
		_id: p._id.toString(),
		code: p.code,
		name: p.name,
		level: p.level,
		grade: p.grade || '',
		reportingToPositionId: null // TODO: Add this field to Position schema
	}));

	// Denormalize employees with resolved references
	const snapshotEmployees: SnapshotEmployee[] = [];

	for (const identity of identities) {
		try {
			// Find org unit
			const orgUnit = orgUnits.find(u =>
				identity.orgUnitId && u._id.equals(new ObjectId(identity.orgUnitId))
			);

			// Find position
			const position = positions.find(p =>
				identity.positionId && p._id.equals(new ObjectId(identity.positionId))
			);

			// Find manager
			const manager = identity.managerId
				? await db.collection('identities').findOne({
					_id: new ObjectId(identity.managerId)
				})
				: null;

			// Create snapshot employee
			snapshotEmployees.push({
				identityId: identity._id.toString(),
				employeeId: identity.employeeId || '',
				fullName: identity.fullName,
				email: identity.email,
				orgUnitId: identity.orgUnitId?.toString() || '',
				orgUnitCode: orgUnit?.code || '',
				orgUnitName: orgUnit?.name || '',
				positionId: identity.positionId?.toString() || '',
				positionCode: position?.code || '',
				positionName: position?.name || '',
				managerId: identity.managerId?.toString(),
				managerName: manager?.fullName,
				employmentType: identity.employmentType || 'permanent',
				employmentStatus: identity.employmentStatus || 'active',
				workLocation: identity.workLocation,
				joinDate: identity.joinDate || now,
				snapshotDate: now
			});
		} catch (error) {
			console.error(`Error processing employee ${identity.employeeId}:`, error);
			// Continue with next employee
		}
	}

	console.log(`Successfully created snapshot with ${snapshotEmployees.length} employees`);

	return {
		orgUnits: snapshotOrgUnits,
		positions: snapshotPositions,
		employees: snapshotEmployees,
		snapshotCreatedAt: now
	};
}

/**
 * Build employee-only snapshot (for partial updates)
 * Useful when only employee data needs to be refreshed
 */
export async function buildEmployeeSnapshot(
	organizationId: string
): Promise<SnapshotEmployee[]> {
	const snapshot = await buildOrgStructureSnapshot(organizationId);
	return snapshot.employees;
}

/**
 * Resolve a single employee's current assignment to snapshot format
 * Useful for real-time queries
 */
export async function resolveEmployeeToSnapshot(
	employeeId: string
): Promise<SnapshotEmployee | null> {
	const db = getDB();

	// Find identity
	const identity = await db.collection('identities').findOne({
		employeeId,
		identityType: 'employee'
	});

	if (!identity) {
		return null;
	}

	// Resolve references
	const [orgUnit, position, manager] = await Promise.all([
		identity.orgUnitId
			? db.collection('org_units').findOne({ _id: new ObjectId(identity.orgUnitId) })
			: null,
		identity.positionId
			? db.collection('positions').findOne({ _id: new ObjectId(identity.positionId) })
			: null,
		identity.managerId
			? db.collection('identities').findOne({ _id: new ObjectId(identity.managerId) })
			: null
	]);

	return {
		identityId: identity._id.toString(),
		employeeId: identity.employeeId || '',
		fullName: identity.fullName,
		email: identity.email,
		orgUnitId: identity.orgUnitId?.toString() || '',
		orgUnitCode: orgUnit?.code || '',
		orgUnitName: orgUnit?.name || '',
		positionId: identity.positionId?.toString() || '',
		positionCode: position?.code || '',
		positionName: position?.name || '',
		managerId: identity.managerId?.toString(),
		managerName: manager?.fullName,
		employmentType: identity.employmentType || 'permanent',
		employmentStatus: identity.employmentStatus || 'active',
		workLocation: identity.workLocation,
		joinDate: identity.joinDate || new Date(),
		snapshotDate: new Date()
	};
}

/**
 * Validate snapshot data before saving
 * Returns array of validation errors
 */
export function validateSnapshot(snapshot: OrgStructureSnapshot): string[] {
	const errors: string[] = [];

	// Check for circular references in org units
	const visited = new Set<string>();
	for (const unit of snapshot.orgUnits) {
		if (hasCircularReference(unit._id, snapshot.orgUnits, visited)) {
			errors.push(`Circular reference detected in org unit: ${unit.name} (${unit.code})`);
		}
		visited.clear();
	}

	// Check for employees with invalid references
	for (const emp of snapshot.employees) {
		if (emp.orgUnitId) {
			const unitExists = snapshot.orgUnits.some(u => u._id === emp.orgUnitId);
			if (!unitExists) {
				errors.push(`Employee ${emp.employeeId} references non-existent org unit: ${emp.orgUnitId}`);
			}
		}

		if (emp.positionId) {
			const positionExists = snapshot.positions.some(p => p._id === emp.positionId);
			if (!positionExists) {
				errors.push(`Employee ${emp.employeeId} references non-existent position: ${emp.positionId}`);
			}
		}
	}

	return errors;
}

/**
 * Helper to detect circular references in org unit hierarchy
 */
function hasCircularReference(
	unitId: string,
	allUnits: SnapshotOrgUnit[],
	visited: Set<string>
): boolean {
	if (visited.has(unitId)) {
		return true; // Circular reference detected
	}

	visited.add(unitId);
	const unit = allUnits.find(u => u._id === unitId);

	if (unit?.parentId) {
		return hasCircularReference(unit.parentId, allUnits, visited);
	}

	return false;
}
