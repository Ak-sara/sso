import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const ScimClientSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),

	clientId: z.string(),
	clientName: z.string(),
	clientSecret: z.string(), // Hashed secret (Argon2)

	organizationId: z.instanceof(ObjectId).optional(),

	scopes: z.array(z.enum([
		'read:users',
		'write:users',
		'delete:users',
		'read:groups',
		'write:groups',
		'delete:groups',
		'bulk:operations'
	])).default(['read:users', 'read:groups']),

	accessTokenExpiresIn: z.number().default(3600),

	ipWhitelist: z.array(z.string()).optional(),
	rateLimit: z.number().default(100),

	isActive: z.boolean().default(true),

	description: z.string().optional(),
	contactEmail: z.string().email().optional(),

	lastUsedAt: z.date().optional(),
	totalRequests: z.number().default(0),

	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string()
});

export type ScimClient = z.infer<typeof ScimClientSchema>;

export const ScimAccessTokenSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),

	token: z.string(),
	clientId: z.string(),
	scopes: z.array(z.string()),
	expiresAt: z.date(),
	isRevoked: z.boolean().default(false),

	createdAt: z.date().default(() => new Date())
});

export type ScimAccessToken = z.infer<typeof ScimAccessTokenSchema>;

export const ScimAuditLogSchema = z.object({
	_id: z.instanceof(ObjectId).optional(),

	clientId: z.string(),
	endpoint: z.string(),
	method: z.string(),
	statusCode: z.number(),
	resourceId: z.string().optional(),
	ipAddress: z.string(),
	userAgent: z.string().optional(),
	duration: z.number(),
	errorMessage: z.string().optional(),

	timestamp: z.date().default(() => new Date())
});

export type ScimAuditLog = z.infer<typeof ScimAuditLogSchema>;
