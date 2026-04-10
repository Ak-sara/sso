import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const EntraIDConfigSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	organizationId: z.string(),

	tenantId: z.string(),
	clientId: z.string(),
	clientSecret: z.string(),

	isConnected: z.boolean().default(false),
	lastTestedAt: z.date().optional(),
	lastTestStatus: z.enum(['success', 'failed']).optional(),
	lastTestError: z.string().optional(),

	syncUsers: z.boolean().default(true),
	syncGroups: z.boolean().default(false),
	autoSync: z.boolean().default(false),
	syncIntervalMinutes: z.number().default(60),

	fieldMapping: z.record(z.string(), z.object({
		entraField: z.string(),
		enabled: z.boolean().default(true),
		direction: z.enum(['to_entra', 'from_entra', 'bidirectional']).default('to_entra'),
	})).default({
		email: { entraField: 'userPrincipalName', enabled: true, direction: 'to_entra' },
		firstName: { entraField: 'givenName', enabled: true, direction: 'to_entra' },
		lastName: { entraField: 'surname', enabled: true, direction: 'to_entra' },
		phone: { entraField: 'mobilePhone', enabled: false, direction: 'to_entra' },
		jobTitle: { entraField: 'jobTitle', enabled: false, direction: 'to_entra' },
		department: { entraField: 'department', enabled: false, direction: 'to_entra' },
	}),

	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string(),
	updatedBy: z.string().optional(),
});

export type EntraIDConfig = z.infer<typeof EntraIDConfigSchema>;

export const EntraIDSyncLogSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	syncId: z.string(),
	organizationId: z.string(),
	type: z.enum(['user', 'group', 'full']),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	startedAt: z.date(),
	completedAt: z.date().optional(),
	totalRecords: z.number().default(0),
	successCount: z.number().default(0),
	failureCount: z.number().default(0),
	errors: z.array(z.object({
		recordId: z.string(),
		error: z.string(),
	})).default([]),
	triggeredBy: z.string(),
	createdAt: z.date().default(() => new Date()),
});

export type EntraIDSyncLog = z.infer<typeof EntraIDSyncLogSchema>;
