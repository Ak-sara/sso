/**
 * TypeScript types for Org Structure Versioning System
 */

// Snapshot types (denormalized for historical records)

export interface SnapshotOrgUnit {
	_id: string;
	code: string;
	name: string;
	parentId?: string;
	type: string;
	level: number;
	sortOrder: number;
	headEmployeeId?: string;
}

export interface SnapshotPosition {
	_id: string;
	code: string;
	name: string;
	level: string;
	grade: string;
	reportingToPositionId?: string | null;
}

export interface SnapshotEmployee {
	identityId: string;
	employeeId: string; // NIK
	fullName: string;
	email?: string;
	orgUnitId: string;
	orgUnitCode: string;
	orgUnitName: string;
	positionId: string;
	positionCode: string;
	positionName: string;
	managerId?: string;
	managerName?: string;
	employmentType: string;
	employmentStatus: string;
	workLocation?: string;
	joinDate: Date;
	snapshotDate: Date;
}

export interface OrgStructureSnapshot {
	orgUnits: SnapshotOrgUnit[];
	positions: SnapshotPosition[];
	employees: SnapshotEmployee[];
	snapshotCreatedAt: Date;
}

// Publish result types

export interface PublishResult {
	success: boolean;
	error?: string;
	message?: string;
}

export interface PublishStep {
	name: string;
	status: 'pending' | 'in_progress' | 'completed' | 'failed';
	completedAt?: Date;
	error?: string;
}

export interface PublishProgress {
	startedAt?: Date;
	completedAt?: Date;
	steps: PublishStep[];
	totalIdentitiesUpdated: number;
	totalHistoryEntriesCreated: number;
	error?: string;
}

// Inconsistency detection types

export interface InconsistencyIssue {
	type: 'missing_org_unit' | 'missing_position' | 'circular_reference' | 'orphaned_employee';
	employeeId?: string;
	orgUnitId?: string;
	orgUnitName?: string;
	positionId?: string;
	description?: string;
}

// Comparison types

export interface VersionComparison {
	orgUnitsAdded: SnapshotOrgUnit[];
	orgUnitsRemoved: SnapshotOrgUnit[];
	positionsAdded: SnapshotPosition[];
	positionsRemoved: SnapshotPosition[];
	employeesAdded: SnapshotEmployee[];
	employeesRemoved: SnapshotEmployee[];
	employeesMoved: EmployeeMovement[];
}

export interface EmployeeMovement {
	employeeId: string;
	employeeName: string;
	from: {
		orgUnitName: string;
		positionName: string;
	};
	to: {
		orgUnitName: string;
		positionName: string;
	};
}
