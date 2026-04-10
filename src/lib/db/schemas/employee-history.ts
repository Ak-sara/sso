import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const EmployeeHistorySchema = z.object({
	_id: z.custom<ObjectId>().optional(),

	identityId: z.custom<ObjectId>(),
	employeeId: z.string(),

	eventType: z.enum([
		'onboarding',
		'mutation',
		'transfer',
		'promotion',
		'demotion',
		'offboarding',
		'org_restructure'
	]),
	eventDate: z.date(),

	previousOrgUnitId: z.custom<ObjectId>().optional(),
	previousPositionId: z.custom<ObjectId>().optional(),
	previousWorkLocation: z.string().optional(),

	newOrgUnitId: z.custom<ObjectId>().optional(),
	newPositionId: z.custom<ObjectId>().optional(),
	newWorkLocation: z.string().optional(),

	reason: z.string().optional(),
	notes: z.string().optional(),

	details: z.object({
		versionId: z.string().optional(),
		versionNumber: z.number().optional(),
		skNumber: z.string().optional(),
		previousOrgUnitName: z.string().optional(),
		previousPositionName: z.string().optional(),
		newOrgUnitName: z.string().optional(),
		newPositionName: z.string().optional(),
	}).optional(),

	createdAt: z.date().default(() => new Date()),
	createdBy: z.string()
});

export type EmployeeHistory = z.infer<typeof EmployeeHistorySchema>;
