import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const OrgStructureVersionSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	versionNumber: z.number(),
	versionName: z.string(),
	organizationId: z.string(),
	effectiveDate: z.date(),
	endDate: z.date().optional(),
	status: z.enum(['draft', 'active', 'archived']).default('draft'),

	// Snapshot of the structure at this version
	structure: z.object({
		orgUnits: z.array(z.object({
			_id: z.string(),
			code: z.string(),
			name: z.string(),
			parentId: z.string().optional(),
			type: z.string(),
			headEmployeeId: z.string().optional(),
		})),
		positions: z.array(z.object({
			_id: z.string(),
			code: z.string(),
			name: z.string(),
			level: z.string(),
			grade: z.string(),
			reportingToPositionId: z.string().optional(),
		})),
		employees: z.array(z.object({
			identityId: z.string(),
			employeeId: z.string(),
			fullName: z.string(),
			email: z.string().optional(),
			orgUnitId: z.string(),
			orgUnitCode: z.string(),
			orgUnitName: z.string(),
			positionId: z.string(),
			positionCode: z.string(),
			positionName: z.string(),
			managerId: z.string().optional(),
			managerName: z.string().optional(),
			employmentType: z.string(),
			employmentStatus: z.string(),
			workLocation: z.string().optional(),
			joinDate: z.date(),
			snapshotDate: z.date()
		})).default([]),
		snapshotCreatedAt: z.date().optional()
	}),

	// Changes from previous version
	changes: z.array(z.object({
		type: z.enum(['unit_added', 'unit_removed', 'unit_renamed', 'unit_moved', 'unit_merged', 'position_added', 'position_removed', 'position_changed']),
		entityType: z.enum(['org_unit', 'position']),
		entityId: z.string(),
		entityName: z.string(),
		oldValue: z.any().optional(),
		newValue: z.any().optional(),
		description: z.string(),
	})).default([]),

	// SK Information
	skNumber: z.string().optional(),
	skDate: z.date().optional(),
	skSignedBy: z.string().optional(),
	skAttachments: z.array(z.object({
		filename: z.string(),
		fileUrl: z.string(),
		fileType: z.string(),
		uploadedAt: z.date(),
	})).default([]),

	// Employee Reassignments
	reassignments: z.array(z.object({
		employeeId: z.string(),
		employeeName: z.string(),
		oldOrgUnitId: z.string().optional(),
		oldOrgUnitName: z.string().optional(),
		oldPositionId: z.string().optional(),
		oldPositionName: z.string().optional(),
		newOrgUnitId: z.string().optional(),
		newOrgUnitName: z.string().optional(),
		newPositionId: z.string().optional(),
		newPositionName: z.string().optional(),
		effectiveDate: z.date(),
		reason: z.string().optional(),
	})).default([]),

	// Publish progress tracking
	publishStatus: z.enum(['not_started', 'in_progress', 'completed', 'failed']).optional(),
	publishProgress: z.object({
		startedAt: z.date().optional(),
		completedAt: z.date().optional(),
		steps: z.array(z.object({
			name: z.string(),
			status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
			completedAt: z.date().optional(),
			error: z.string().optional()
		})),
		totalIdentitiesUpdated: z.number().default(0),
		totalHistoryEntriesCreated: z.number().default(0),
		error: z.string().optional()
	}).optional(),

	// Metadata
	createdBy: z.string(),
	approvedBy: z.string().optional(),
	approvedAt: z.date().optional(),
	notes: z.string().optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type OrgStructureVersion = z.infer<typeof OrgStructureVersionSchema>;
