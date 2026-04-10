import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const SKPenempatanSchema = z.object({
	_id: z.custom<ObjectId>().optional(),

	skNumber: z.string(),
	skDate: z.date(),
	skTitle: z.string().optional(),
	effectiveDate: z.date(),

	signedBy: z.string(),
	signedByPosition: z.string().optional(),
	signedAt: z.date().optional(),

	organizationId: z.string(),
	orgStructureVersionId: z.string().optional(),

	status: z.enum(['draft', 'pending_approval', 'approved', 'executed', 'cancelled']).default('draft'),

	reassignments: z.array(z.object({
		employeeId: z.string(),
		employeeName: z.string(),
		previousOrgUnitId: z.string().optional(),
		previousOrgUnitName: z.string().optional(),
		previousPositionId: z.string().optional(),
		previousPositionName: z.string().optional(),
		previousWorkLocation: z.string().optional(),
		newOrgUnitId: z.string(),
		newOrgUnitName: z.string(),
		newPositionId: z.string().optional(),
		newPositionName: z.string().optional(),
		newWorkLocation: z.string().optional(),
		newRegion: z.string().optional(),
		reason: z.string().optional(),
		notes: z.string().optional(),
		executed: z.boolean().default(false),
		executedAt: z.date().optional(),
		executionError: z.string().optional()
	})),

	attachments: z.array(z.object({
		filename: z.string(),
		fileUrl: z.string(),
		fileType: z.string(),
		uploadedAt: z.date(),
		uploadedBy: z.string()
	})).default([]),

	importedFromCSV: z.boolean().default(false),
	csvFilename: z.string().optional(),
	csvImportedAt: z.date().optional(),

	totalReassignments: z.number(),
	successfulReassignments: z.number().default(0),
	failedReassignments: z.number().default(0),

	description: z.string().optional(),
	notes: z.string().optional(),

	requestedBy: z.string(),
	requestedAt: z.date(),
	approvedBy: z.string().optional(),
	approvedAt: z.date().optional(),
	rejectedBy: z.string().optional(),
	rejectedAt: z.date().optional(),
	rejectionReason: z.string().optional(),

	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string(),
	updatedBy: z.string().optional()
});

export type SKPenempatan = z.infer<typeof SKPenempatanSchema>;
