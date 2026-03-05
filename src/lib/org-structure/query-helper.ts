import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import type { OrgStructureSnapshot, SnapshotEmployee, VersionComparison } from './types';

/**
 * Historical query utilities for organization structure versions
 * All queries use snapshot data - no live collection queries
 */
export class QueryHelper {
	/**
	 * Get organization structure as it existed on a specific date
	 * Uses version snapshots to reconstruct historical state
	 *
	 * @param organizationId - Organization ID
	 * @param date - Date to query
	 * @returns Snapshot from active version on that date, or null
	 */
	async getOrgStructureAt(
		organizationId: string,
		date: Date
	): Promise<OrgStructureSnapshot | null> {
		const db = getDB();

		console.log(`Querying org structure at ${date.toISOString()}`);

		// Find version that was active on the given date
		const version = await db.collection('org_structure_versions').findOne({
			organizationId,
			status: 'active',
			effectiveDate: { $lte: date },
			$or: [{ endDate: null }, { endDate: { $gt: date } }]
		});

		if (!version) {
			console.log('No active version found for date');
			return null;
		}

		return version.structure as OrgStructureSnapshot;
	}

	/**
	 * Get employee's assignment (org unit + position) at specific date
	 * Returns snapshot data showing where employee was assigned
	 *
	 * @param employeeId - Employee NIK
	 * @param date - Date to query
	 * @returns Employee snapshot from version active on that date
	 */
	async getEmployeeAssignmentAt(
		employeeId: string,
		date: Date
	): Promise<SnapshotEmployee | null> {
		const db = getDB();

		console.log(`Querying employee ${employeeId} assignment at ${date.toISOString()}`);

		// Find active version on that date
		const version = await db.collection('org_structure_versions').findOne({
			status: 'active',
			effectiveDate: { $lte: date },
			$or: [{ endDate: null }, { endDate: { $gt: date } }]
		});

		if (!version?.structure?.employees) {
			return null;
		}

		// Find employee in snapshot
		const employee = version.structure.employees.find(
			(e: any) => e.employeeId === employeeId
		);

		return employee || null;
	}

	/**
	 * Get all employees in an org unit at a specific version
	 * Uses snapshot data for accurate historical team composition
	 *
	 * @param orgUnitId - Org unit ID
	 * @param versionId - Version ID
	 * @returns Array of employees in that unit at that version
	 */
	async getOrgUnitMembersAt(
		orgUnitId: string,
		versionId: string
	): Promise<SnapshotEmployee[]> {
		const db = getDB();

		console.log(`Querying org unit ${orgUnitId} members at version ${versionId}`);

		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version?.structure?.employees) {
			return [];
		}

		// Filter employees by org unit
		const members = version.structure.employees.filter(
			(e: any) => e.orgUnitId === orgUnitId
		);

		return members;
	}

	/**
	 * Get employee's complete timeline in a specific org unit
	 * Shows all periods employee was assigned to this unit across versions
	 *
	 * @param employeeId - Employee NIK
	 * @param orgUnitId - Org unit ID
	 * @returns Array of timeline entries with version info
	 */
	async getEmployeeTimelineInUnit(
		employeeId: string,
		orgUnitId: string
	): Promise<
		Array<{
			versionId: string;
			versionNumber: number;
			versionName: string;
			effectiveDate: Date;
			endDate: Date | null;
			positionName: string;
			positionCode: string;
		}>
	> {
		const db = getDB();

		console.log(`Building timeline for employee ${employeeId} in unit ${orgUnitId}`);

		// Find all versions where employee was in this org unit
		const versions = await db
			.collection('org_structure_versions')
			.find({
				status: { $in: ['active', 'archived'] },
				'structure.employees': {
					$elemMatch: {
						employeeId,
						orgUnitId
					}
				}
			})
			.sort({ effectiveDate: 1 })
			.toArray();

		const timeline = versions.map((v) => {
			const employee = v.structure.employees.find((e: any) => e.employeeId === employeeId);

			return {
				versionId: v._id.toString(),
				versionNumber: v.versionNumber,
				versionName: v.versionName,
				effectiveDate: v.effectiveDate,
				endDate: v.endDate,
				positionName: employee?.positionName || '',
				positionCode: employee?.positionCode || ''
			};
		});

		return timeline;
	}

	/**
	 * Compare two versions to see what changed
	 * Returns detailed diff of org units, positions, and employees
	 *
	 * @param versionId1 - First version ID
	 * @param versionId2 - Second version ID
	 * @returns Comparison result with added/removed/modified items
	 */
	async compareVersions(versionId1: string, versionId2: string): Promise<VersionComparison> {
		const db = getDB();

		console.log(`Comparing versions ${versionId1} vs ${versionId2}`);

		const [version1, version2] = await Promise.all([
			db.collection('org_structure_versions').findOne({ _id: new ObjectId(versionId1) }),
			db.collection('org_structure_versions').findOne({ _id: new ObjectId(versionId2) })
		]);

		if (!version1 || !version2) {
			throw new Error('One or both versions not found');
		}

		const comparison: VersionComparison = {
			version1: {
				id: versionId1,
				number: version1.versionNumber,
				name: version1.versionName,
				effectiveDate: version1.effectiveDate
			},
			version2: {
				id: versionId2,
				number: version2.versionNumber,
				name: version2.versionName,
				effectiveDate: version2.effectiveDate
			},
			orgUnits: {
				added: [],
				removed: [],
				modified: []
			},
			positions: {
				added: [],
				removed: [],
				modified: []
			},
			employees: {
				added: [],
				removed: [],
				reassigned: []
			}
		};

		// Compare org units
		const units1 = new Map(version1.structure.orgUnits.map((u: any) => [u._id, u]));
		const units2 = new Map(version2.structure.orgUnits.map((u: any) => [u._id, u]));

		for (const [id, unit] of units2) {
			if (!units1.has(id)) {
				comparison.orgUnits.added.push({
					id,
					name: unit.name,
					code: unit.code
				});
			} else {
				const oldUnit = units1.get(id);
				if (
					oldUnit.name !== unit.name ||
					oldUnit.code !== unit.code ||
					oldUnit.parentId !== unit.parentId
				) {
					comparison.orgUnits.modified.push({
						id,
						field: 'multiple',
						oldValue: JSON.stringify(oldUnit),
						newValue: JSON.stringify(unit)
					});
				}
			}
		}

		for (const [id, unit] of units1) {
			if (!units2.has(id)) {
				comparison.orgUnits.removed.push({
					id,
					name: unit.name,
					code: unit.code
				});
			}
		}

		// Compare positions
		const positions1 = new Map(version1.structure.positions.map((p: any) => [p._id, p]));
		const positions2 = new Map(version2.structure.positions.map((p: any) => [p._id, p]));

		for (const [id, position] of positions2) {
			if (!positions1.has(id)) {
				comparison.positions.added.push({
					id,
					name: position.name,
					code: position.code
				});
			} else {
				const oldPosition = positions1.get(id);
				if (
					oldPosition.name !== position.name ||
					oldPosition.code !== position.code ||
					oldPosition.level !== position.level
				) {
					comparison.positions.modified.push({
						id,
						field: 'multiple',
						oldValue: JSON.stringify(oldPosition),
						newValue: JSON.stringify(position)
					});
				}
			}
		}

		for (const [id, position] of positions1) {
			if (!positions2.has(id)) {
				comparison.positions.removed.push({
					id,
					name: position.name,
					code: position.code
				});
			}
		}

		// Compare employees
		const employees1 = new Map(
			version1.structure.employees.map((e: any) => [e.employeeId, e])
		);
		const employees2 = new Map(
			version2.structure.employees.map((e: any) => [e.employeeId, e])
		);

		for (const [nik, emp] of employees2) {
			if (!employees1.has(nik)) {
				comparison.employees.added.push({
					employeeId: nik,
					fullName: emp.fullName,
					orgUnitName: emp.orgUnitName,
					positionName: emp.positionName
				});
			} else {
				const oldEmp = employees1.get(nik);
				if (oldEmp.orgUnitId !== emp.orgUnitId || oldEmp.positionId !== emp.positionId) {
					comparison.employees.reassigned.push({
						employeeId: nik,
						fullName: emp.fullName,
						oldOrgUnit: oldEmp.orgUnitName,
						newOrgUnit: emp.orgUnitName,
						oldPosition: oldEmp.positionName,
						newPosition: emp.positionName
					});
				}
			}
		}

		for (const [nik, emp] of employees1) {
			if (!employees2.has(nik)) {
				comparison.employees.removed.push({
					employeeId: nik,
					fullName: emp.fullName,
					orgUnitName: emp.orgUnitName,
					positionName: emp.positionName
				});
			}
		}

		console.log(
			`Comparison complete: ${comparison.orgUnits.added.length} units added, ${comparison.employees.reassigned.length} employees reassigned`
		);

		return comparison;
	}

	/**
	 * Get all versions for an organization in chronological order
	 * Useful for timeline visualizations
	 *
	 * @param organizationId - Organization ID
	 * @returns Array of version metadata (no full snapshots)
	 */
	async getVersionTimeline(
		organizationId: string
	): Promise<
		Array<{
			versionId: string;
			versionNumber: number;
			versionName: string;
			effectiveDate: Date;
			endDate: Date | null;
			status: string;
			totalEmployees: number;
			totalOrgUnits: number;
		}>
	> {
		const db = getDB();

		const versions = await db
			.collection('org_structure_versions')
			.find({ organizationId })
			.sort({ versionNumber: 1 })
			.toArray();

		return versions.map((v) => ({
			versionId: v._id.toString(),
			versionNumber: v.versionNumber,
			versionName: v.versionName,
			effectiveDate: v.effectiveDate,
			endDate: v.endDate,
			status: v.status,
			totalEmployees: v.structure?.employees?.length || 0,
			totalOrgUnits: v.structure?.orgUnits?.length || 0
		}));
	}

	/**
	 * Get statistics for a specific version
	 * Returns counts and aggregations
	 *
	 * @param versionId - Version ID
	 * @returns Version statistics
	 */
	async getVersionStats(versionId: string): Promise<{
		totalOrgUnits: number;
		totalPositions: number;
		totalEmployees: number;
		employeesByUnit: Record<string, number>;
		employeesByPosition: Record<string, number>;
		employeesByStatus: Record<string, number>;
		averageTeamSize: number;
	}> {
		const db = getDB();

		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version?.structure) {
			throw new Error('Version not found');
		}

		const employees = version.structure.employees || [];
		const orgUnits = version.structure.orgUnits || [];
		const positions = version.structure.positions || [];

		// Count employees by org unit
		const employeesByUnit: Record<string, number> = {};
		for (const emp of employees) {
			employeesByUnit[emp.orgUnitName] = (employeesByUnit[emp.orgUnitName] || 0) + 1;
		}

		// Count employees by position
		const employeesByPosition: Record<string, number> = {};
		for (const emp of employees) {
			employeesByPosition[emp.positionName] =
				(employeesByPosition[emp.positionName] || 0) + 1;
		}

		// Count employees by status
		const employeesByStatus: Record<string, number> = {};
		for (const emp of employees) {
			employeesByStatus[emp.employmentStatus] =
				(employeesByStatus[emp.employmentStatus] || 0) + 1;
		}

		// Calculate average team size
		const unitsWithEmployees = Object.keys(employeesByUnit).length;
		const averageTeamSize =
			unitsWithEmployees > 0 ? employees.length / unitsWithEmployees : 0;

		return {
			totalOrgUnits: orgUnits.length,
			totalPositions: positions.length,
			totalEmployees: employees.length,
			employeesByUnit,
			employeesByPosition,
			employeesByStatus,
			averageTeamSize: Math.round(averageTeamSize * 10) / 10
		};
	}

	/**
	 * Search employees across all versions
	 * Finds all versions where employee appears with specific criteria
	 *
	 * @param employeeId - Employee NIK
	 * @param filters - Optional filters (orgUnitId, positionId, etc.)
	 * @returns Array of version entries where employee matches criteria
	 */
	async searchEmployeeHistory(
		employeeId: string,
		filters?: {
			orgUnitId?: string;
			positionId?: string;
			employmentStatus?: string;
			fromDate?: Date;
			toDate?: Date;
		}
	): Promise<
		Array<{
			versionId: string;
			versionNumber: number;
			versionName: string;
			effectiveDate: Date;
			employee: SnapshotEmployee;
		}>
	> {
		const db = getDB();

		const query: any = {
			'structure.employees.employeeId': employeeId
		};

		if (filters?.fromDate) {
			query.effectiveDate = { $gte: filters.fromDate };
		}
		if (filters?.toDate) {
			query.effectiveDate = query.effectiveDate || {};
			query.effectiveDate.$lte = filters.toDate;
		}

		const versions = await db
			.collection('org_structure_versions')
			.find(query)
			.sort({ effectiveDate: 1 })
			.toArray();

		const results: Array<{
			versionId: string;
			versionNumber: number;
			versionName: string;
			effectiveDate: Date;
			employee: SnapshotEmployee;
		}> = [];

		for (const version of versions) {
			const employee = version.structure.employees.find((e: any) => e.employeeId === employeeId);

			if (!employee) continue;

			// Apply additional filters
			if (filters?.orgUnitId && employee.orgUnitId !== filters.orgUnitId) continue;
			if (filters?.positionId && employee.positionId !== filters.positionId) continue;
			if (filters?.employmentStatus && employee.employmentStatus !== filters.employmentStatus)
				continue;

			results.push({
				versionId: version._id.toString(),
				versionNumber: version.versionNumber,
				versionName: version.versionName,
				effectiveDate: version.effectiveDate,
				employee
			});
		}

		return results;
	}
}

// Export singleton instance
export const queryHelper = new QueryHelper();
