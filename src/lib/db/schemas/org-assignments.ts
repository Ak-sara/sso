import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const EmployeeAssignmentsSchema = z.object({
	_id: z.custom<ObjectId>().optional(),

	identityId: z.custom<ObjectId>(),
	idNumber: z.string().optional(), // KTP / Pasport

	organizationId: z.string(), // Which realm/org this identity belongs to
	orgUnitId: z.string().optional(), // Department/division
	positionId: z.string().optional(), // Job level
	employeeId: z.string().optional(), // NIK - UNIQUE, can be used as username	
	
	workLocation: z.string().optional(), // CGK, DPS, etc
	region: z.string().optional(),
	isRemote: z.boolean().optional(),

	joinDate: z.date().optional(),
	probationEndDate: z.date().optional(),
	endDate: z.date().optional(), // For PKWT/contract

	// Employment details
	employmentType: z.enum(['permanent', 'pkwt', 'outsource', 'contract']).optional(),
	employmentStatus: z.enum(['active', 'probation', 'terminated', 'resigned']).optional(),

	letterId: z.custom<ObjectId>().optional(),
	letterNo: z.string().optional(),

	createdAt: z.date().default(() => new Date()),
	createdBy: z.string()
});

export type EmployeeAssignments = z.infer<typeof EmployeeAssignmentsSchema>;
