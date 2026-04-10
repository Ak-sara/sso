import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const AuditLogSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	identityId: z.string(),
	action: z.string(),
	resource: z.string(),
	resourceId: z.string().optional(),
	details: z.record(z.string(), z.any()).optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	organizationId: z.string().optional(),
	timestamp: z.date().default(() => new Date()),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
