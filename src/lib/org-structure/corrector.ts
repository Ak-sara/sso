import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import type { InconsistencyIssue } from './types';

/**
 * Data correction utilities for embedded snapshot data
 * Fixes mistakes in version snapshots without affecting live data
 */
export class VersionCorrector {
	/**
	 * Correct employee data in version snapshot
	 * Does NOT affect live identity data
	 *
	 * @param versionId - Version ID
	 * @param employeeId - Employee NIK
	 * @param corrections - Fields to correct
	 */
	async correctEmployeeInSnapshot(
		versionId: string,
		employeeId: string,
		corrections: {
			fullName?: string;
			email?: string;
			orgUnitName?: string;
			orgUnitCode?: string;
			positionName?: string;
			positionCode?: string;
			managerName?: string;
			[key: string]: any;
		}
	) {
		const db = getDB();

		console.log(`Correcting employee ${employeeId} in version ${versionId}`);

		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) {
			throw new Error('Version not found');
		}

		// Find employee in snapshot
		const employeeIndex = version.structure.employees.findIndex(
			(e: any) => e.employeeId === employeeId
		);

		if (employeeIndex === -1) {
			throw new Error(`Employee ${employeeId} not found in snapshot`);
		}

		// Update embedded document
		const updateFields: any = {};
		for (const [key, value] of Object.entries(corrections)) {
			updateFields[`structure.employees.${employeeIndex}.${key}`] = value;
		}
		updateFields.updatedAt = new Date();

		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: updateFields }
		);

		// Log correction
		await this.logCorrection(versionId, 'employee', employeeId, corrections);

		console.log(`Employee ${employeeId} corrected successfully`);
	}

	/**
	 * Sync org unit changes to both snapshot and live collection
	 * Updates version snapshot AND live org_units collection
	 *
	 * @param versionId - Version ID
	 * @param orgUnitId - Org unit ID
	 * @param updates - Fields to update
	 */
	async syncOrgUnitChanges(
		versionId: string,
		orgUnitId: string,
		updates: { name?: string; code?: string; parentId?: string; type?: string }
	) {
		const db = getDB();

		console.log(`Syncing org unit ${orgUnitId} changes`);

		// 1. Update in version snapshot
		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) {
			throw new Error('Version not found');
		}

		// Find org unit in snapshot
		const unitIndex = version.structure.orgUnits.findIndex((u: any) => u._id === orgUnitId);

		if (unitIndex === -1) {
			throw new Error(`Org unit ${orgUnitId} not found in snapshot`);
		}

		// Update org unit in snapshot
		const updateFields: any = {};
		for (const [key, value] of Object.entries(updates)) {
			updateFields[`structure.orgUnits.${unitIndex}.${key}`] = value;
		}
		updateFields.updatedAt = new Date();

		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: updateFields }
		);

		// 2. Update live collection (affects current operations)
		await db.collection('org_units').updateOne(
			{ _id: new ObjectId(orgUnitId) },
			{
				$set: {
					...updates,
					updatedAt: new Date()
				}
			}
		);

		// 3. Update employees in snapshot that reference this unit
		if (updates.name || updates.code) {
			const updatedEmployees = version.structure.employees.map((emp: any) => {
				if (emp.orgUnitId === orgUnitId) {
					return {
						...emp,
						...(updates.name && { orgUnitName: updates.name }),
						...(updates.code && { orgUnitCode: updates.code })
					};
				}
				return emp;
			});

			await db.collection('org_structure_versions').updateOne(
				{ _id: new ObjectId(versionId) },
				{ $set: { 'structure.employees': updatedEmployees } }
			);
		}

		await this.logCorrection(versionId, 'org_unit', orgUnitId, updates);

		console.log(`Org unit ${orgUnitId} synced successfully`);
	}

	/**
	 * Sync position changes to both snapshot and live collection
	 *
	 * @param versionId - Version ID
	 * @param positionId - Position ID
	 * @param updates - Fields to update
	 */
	async syncPositionChanges(
		versionId: string,
		positionId: string,
		updates: { name?: string; code?: string; level?: string; grade?: string }
	) {
		const db = getDB();

		console.log(`Syncing position ${positionId} changes`);

		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) {
			throw new Error('Version not found');
		}

		// Find position in snapshot
		const positionIndex = version.structure.positions.findIndex(
			(p: any) => p._id === positionId
		);

		if (positionIndex === -1) {
			throw new Error(`Position ${positionId} not found in snapshot`);
		}

		// Update position in snapshot
		const updateFields: any = {};
		for (const [key, value] of Object.entries(updates)) {
			updateFields[`structure.positions.${positionIndex}.${key}`] = value;
		}
		updateFields.updatedAt = new Date();

		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: updateFields }
		);

		// Update live collection
		await db.collection('positions').updateOne(
			{ _id: new ObjectId(positionId) },
			{
				$set: {
					...updates,
					updatedAt: new Date()
				}
			}
		);

		// Update employees in snapshot that reference this position
		if (updates.name || updates.code) {
			const updatedEmployees = version.structure.employees.map((emp: any) => {
				if (emp.positionId === positionId) {
					return {
						...emp,
						...(updates.name && { positionName: updates.name }),
						...(updates.code && { positionCode: updates.code })
					};
				}
				return emp;
			});

			await db.collection('org_structure_versions').updateOne(
				{ _id: new ObjectId(versionId) },
				{ $set: { 'structure.employees': updatedEmployees } }
			);
		}

		await this.logCorrection(versionId, 'position', positionId, updates);

		console.log(`Position ${positionId} synced successfully`);
	}

	/**
	 * Detect inconsistencies in version snapshot
	 * Returns array of issues found
	 *
	 * @param versionId - Version ID
	 * @returns Array of inconsistency issues
	 */
	async detectInconsistencies(versionId: string): Promise<InconsistencyIssue[]> {
		const db = getDB();

		console.log(`Detecting inconsistencies in version ${versionId}`);

		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) {
			throw new Error('Version not found');
		}

		const issues: InconsistencyIssue[] = [];

		// Check for employees with invalid org unit references
		for (const emp of version.structure.employees) {
			if (emp.orgUnitId) {
				const unitExists = version.structure.orgUnits.some((u: any) => u._id === emp.orgUnitId);

				if (!unitExists) {
					issues.push({
						type: 'missing_org_unit',
						employeeId: emp.employeeId,
						orgUnitId: emp.orgUnitId,
						description: `Employee ${emp.employeeId} (${emp.fullName}) references non-existent org unit: ${emp.orgUnitId}`
					});
				}
			}

			// Check for invalid position references
			if (emp.positionId) {
				const positionExists = version.structure.positions.some(
					(p: any) => p._id === emp.positionId
				);

				if (!positionExists) {
					issues.push({
						type: 'missing_position',
						employeeId: emp.employeeId,
						positionId: emp.positionId,
						description: `Employee ${emp.employeeId} (${emp.fullName}) references non-existent position: ${emp.positionId}`
					});
				}
			}
		}

		// Check for circular references in org units
		const visited = new Set<string>();
		for (const unit of version.structure.orgUnits) {
			visited.clear();
			if (this.hasCircularReference(unit._id, version.structure.orgUnits, visited)) {
				issues.push({
					type: 'circular_reference',
					orgUnitId: unit._id,
					orgUnitName: unit.name,
					description: `Circular reference detected in org unit hierarchy: ${unit.name} (${unit.code})`
				});
			}
		}

		// Check for orphaned employees (employees without valid assignments)
		for (const emp of version.structure.employees) {
			if (!emp.orgUnitId && !emp.positionId) {
				issues.push({
					type: 'orphaned_employee',
					employeeId: emp.employeeId,
					description: `Employee ${emp.employeeId} (${emp.fullName}) has no org unit or position assignment`
				});
			}
		}

		console.log(`Found ${issues.length} inconsistencies`);

		return issues;
	}

	/**
	 * Fix all detected inconsistencies automatically
	 * Returns count of fixed issues
	 *
	 * @param versionId - Version ID
	 * @returns Number of issues fixed
	 */
	async autoFixInconsistencies(versionId: string): Promise<number> {
		const issues = await this.detectInconsistencies(versionId);
		let fixed = 0;

		console.log(`Attempting to auto-fix ${issues.length} issues`);

		for (const issue of issues) {
			try {
				switch (issue.type) {
					case 'orphaned_employee':
						// Remove orphaned employee from snapshot
						await this.removeEmployeeFromSnapshot(versionId, issue.employeeId!);
						fixed++;
						break;

					// Other issue types require manual intervention
					default:
						console.warn(`Cannot auto-fix issue type: ${issue.type}`);
				}
			} catch (error) {
				console.error(`Error fixing issue:`, issue, error);
			}
		}

		console.log(`Auto-fixed ${fixed} issues`);

		return fixed;
	}

	/**
	 * Remove employee from snapshot
	 * Private helper for autoFixInconsistencies
	 */
	private async removeEmployeeFromSnapshot(versionId: string, employeeId: string) {
		const db = getDB();

		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) return;

		const updatedEmployees = version.structure.employees.filter(
			(e: any) => e.employeeId !== employeeId
		);

		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: { 'structure.employees': updatedEmployees } }
		);
	}

	/**
	 * Helper to detect circular references in org unit hierarchy
	 */
	private hasCircularReference(
		unitId: string,
		allUnits: any[],
		visited: Set<string>
	): boolean {
		if (visited.has(unitId)) {
			return true; // Circular reference detected
		}

		visited.add(unitId);
		const unit = allUnits.find((u) => u._id === unitId);

		if (unit?.parentId) {
			return this.hasCircularReference(unit.parentId, allUnits, visited);
		}

		return false;
	}

	/**
	 * Log correction to audit trail
	 */
	private async logCorrection(
		versionId: string,
		entityType: string,
		entityId: string,
		corrections: any
	) {
		const db = getDB();

		try {
			await db.collection('audit_logs').insertOne({
				action: 'version_correction',
				resourceType: 'org_structure_version',
				resourceId: versionId,
				details: {
					entityType,
					entityId,
					corrections
				},
				timestamp: new Date(),
				userId: 'system' // TODO: Get from session
			});
		} catch (error) {
			console.error('Error logging correction:', error);
			// Don't throw - correction succeeded even if logging failed
		}
	}
}

// Export singleton instance
export const versionCorrector = new VersionCorrector();
