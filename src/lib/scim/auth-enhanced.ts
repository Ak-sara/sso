/**
 * Enhanced SCIM Authentication
 * OAuth 2.0 Bearer Token with per-client credentials (Okta-style)
 */

import { error, type RequestEvent } from '@sveltejs/kit';
import { hash, verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '$lib/db/db';
import { getDB } from '$lib/db/connection';
import { logAudit } from '$lib/audit/logger';
import type { ScimClient, ScimAccessToken } from '$lib/db/schemas';
import { ObjectId } from 'mongodb';
import { createScimError } from './utils';
import { randomBytes } from 'crypto';
import { useRateLimit } from '@ak-sara/fbao/foundation';

const JWT_SECRET = new TextEncoder().encode( process.env.SCIM_JWT_SECRET || 'your-secret-key-change-in-production' );

/**
 * Generate SCIM client credentials
 */
export async function generateScimClient(data: {
	clientName: string;
	organizationId?: string;
	scopes?: string[];
	rateLimit?: number;
	ipWhitelist?: string[];
	createdBy: string;
	description?: string;
	contactEmail?: string;
}): Promise<{ client: ScimClient; plainSecret: string }> {
	const clientId = `scim-${randomBytes(8).toString('hex')}`;
	const plainSecret = randomBytes(32).toString('base64');
	const hashedSecret = await hash(plainSecret);

	const client: Omit<ScimClient, '_id'> = {
		clientId,
		clientName: data.clientName,
		clientSecret: hashedSecret,
		organizationId: data.organizationId ? new ObjectId(data.organizationId) : undefined,
		scopes: (data.scopes || ['read:users', 'read:groups']) as ScimClient['scopes'],
		accessTokenExpiresIn: 3600,
		rateLimit: data.rateLimit || 100,
		ipWhitelist: data.ipWhitelist,
		isActive: true,
		description: data.description,
		contactEmail: data.contactEmail,
		totalRequests: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		createdBy: data.createdBy
	};

	const result = await db.scimClients.insertOne(client as any);

	return {
		client: { ...client, _id: result._id } as ScimClient,
		plainSecret
	};
}

/**
 * Authenticate SCIM client and issue JWT token (like OAuth 2.0 client credentials flow)
 */
export async function authenticateScimClient(
	clientId: string,
	clientSecret: string
): Promise<string> {
	const client = await db.scimClients.findOne({ clientId } as any) as ScimClient | null;

	if (!client || !client.isActive) throw error(401, 'Invalid client credentials');

	const isValid = await verify(client.clientSecret, clientSecret);
	if (!isValid) throw error(401, 'Invalid client credentials');

	const token = await new SignJWT({ client_id: clientId, scopes: client.scopes })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${client.accessTokenExpiresIn}s`)
		.setSubject(clientId)
		.sign(JWT_SECRET);

	await db.scimAccessTokens.insertOne({
		token, clientId,
		scopes: client.scopes as any,
		expiresAt: new Date(Date.now() + client.accessTokenExpiresIn * 1000),
		isRevoked: false,
		createdAt: new Date()
	} as any);

	await db.scimClients.updateOne({ clientId } as any, { lastUsedAt: new Date() } as any);

	return token;
}

/**
 * Validate SCIM Bearer token and extract client info
 */
export async function validateScimToken(
	token: string
): Promise<{ clientId: string; scopes: string[] }> {
	try {
		const { payload } = await jwtVerify(token, JWT_SECRET);
		const clientId = payload.sub as string;
		const scopes = payload.scopes as string[];

		const tokenRecord = await db.scimAccessTokens.findOne({ token, isRevoked: false } as any);
		if (!tokenRecord) throw new Error('Token revoked or not found');

		const client = await db.scimClients.findOne({ clientId } as any) as ScimClient | null;
		if (!client || !client.isActive) throw new Error('Client inactive');

		return { clientId, scopes };
	} catch {
		throw error(401, 'Invalid or expired token');
	}
}

/**
 * Check if client has required scope
 */
export function hasScope(clientScopes: string[], requiredScope: string): boolean {
	return clientScopes.includes(requiredScope);
}

/**
 * Require SCIM authentication with scope check
 */
export async function requireScimAuthEnhanced(
	event: RequestEvent,
	requiredScope?: string
): Promise<{ clientId: string; scopes: string[] }> {
	const authHeader = event.request.headers.get('Authorization');

	if (!authHeader) {
		throw error(
			401,
			JSON.stringify(createScimError(401, 'Authorization header required', undefined))
		);
	}

	// Check for Bearer token
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	if (!match) {
		throw error(
			401,
			JSON.stringify(
				createScimError(401, 'Invalid authorization format. Use: Bearer <token>', undefined)
			)
		);
	}

	const token = match[1];

	// Validate token
	const { clientId, scopes } = await validateScimToken(token);

	// Check scope if required
	if (requiredScope && !hasScope(scopes, requiredScope)) {
		throw error(
			403,
			JSON.stringify(
				createScimError(403, `Insufficient scope. Required: ${requiredScope}`, undefined)
			)
		);
	}

	// Check IP whitelist
	await checkIpWhitelist(clientId, event.getClientAddress());

	// Check rate limit
	await checkRateLimit(clientId);

	return { clientId, scopes };
}

/**
 * Check IP whitelist
 */
async function checkIpWhitelist(clientId: string, ipAddress: string): Promise<void> {
	const client = await db.scimClients.findOne({ clientId } as any) as ScimClient | null;

	if (!client || !client.ipWhitelist || client.ipWhitelist.length === 0) {
		return; // No whitelist configured
	}

	// Simple IP check (for production, use a library like ip-range-check)
	const isAllowed = client.ipWhitelist.some((allowedIp) => {
		if (allowedIp.includes('/')) {
			// CIDR notation - simplified check (use library in production)
			return ipAddress.startsWith(allowedIp.split('/')[0].split('.').slice(0, 3).join('.'));
		}
		return ipAddress === allowedIp;
	});

	if (!isAllowed) {
		throw error(
			403,
			JSON.stringify(
				createScimError(403, `IP address ${ipAddress} not whitelisted`, undefined)
			)
		);
	}
}

/**
 * Check rate limit using FBA RateLimiter (per-client limits)
 */
async function checkRateLimit(clientId: string): Promise<void> {
	const client = await db.scimClients.findOne({ clientId } as any) as ScimClient | null;
	if (!client) return;

	const limiter = useRateLimit('scim');
	const result = await limiter.check(clientId, client.rateLimit);

	if (!result.allowed) {
		const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
		throw error(429, JSON.stringify(createScimError(429, `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`, 'tooMany')));
	}

	await db.scimClients.col.updateOne({ clientId }, { $inc: { totalRequests: 1 }, $set: { lastUsedAt: new Date() } });
}

/**
 * Log SCIM request (audit trail)
 */
export async function logScimRequest(data: {
	clientId: string;
	endpoint: string;
	method: string;
	statusCode: number;
	resourceId?: string;
	ipAddress: string;
	userAgent?: string;
	duration: number;
	errorMessage?: string;
}): Promise<void> {
	await logAudit({
		identityId: data.clientId,
		action: 'scim_request',
		resource: 'scim_clients',
		resourceId: data.resourceId,
		details: { endpoint: data.endpoint, method: data.method, statusCode: data.statusCode, duration: data.duration, errorMessage: data.errorMessage },
		ipAddress: data.ipAddress,
		userAgent: data.userAgent,
	});
}

/**
 * Revoke SCIM token
 */
export async function revokeScimToken(token: string): Promise<void> {
	await db.scimAccessTokens.updateOne({ token } as any, { isRevoked: true } as any);
}

export async function revokeAllClientTokens(clientId: string): Promise<void> {
	await db.scimAccessTokens.col.updateMany({ clientId }, { $set: { isRevoked: true } });
}

export async function deactivateScimClient(clientId: string): Promise<void> {
	await db.scimClients.updateOne({ clientId } as any, { isActive: false, updatedAt: new Date() } as any);
	await revokeAllClientTokens(clientId);
}

export async function deleteScimClient(clientId: string): Promise<void> {
	const client = await db.scimClients.findOne({ clientId } as any) as ScimClient | null;
	if (!client) throw error(404, 'Client not found');
	if (client.isActive) throw error(400, 'Cannot delete active client. Deactivate first.');

	await revokeAllClientTokens(clientId);
	await db.scimClients.deleteOne({ clientId } as any);
	await logScimRequest({ clientId, endpoint: '/clients-scim/delete', method: 'DELETE', statusCode: 200, ipAddress: '127.0.0.1', duration: 0 });
}

export async function rotateClientSecret(clientId: string): Promise<{ plainSecret: string }> {
	const plainSecret = randomBytes(32).toString('base64');
	const hashedSecret = await hash(plainSecret);

	await db.scimClients.updateOne({ clientId } as any, { clientSecret: hashedSecret, updatedAt: new Date() } as any);
	await revokeAllClientTokens(clientId);

	return { plainSecret };
}

export async function getClientStats(clientId: string) {
	const client = await db.scimClients.findOne({ clientId } as any) as ScimClient | null;
	if (!client) throw error(404, 'Client not found');

	const recentLogs = await getDB().collection('audit_log')
		.find({ identityId: clientId, resource: 'scim_clients' })
		.sort({ timestamp: -1 })
		.limit(100)
		.toArray();

	const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const requestsLast24h = recentLogs.filter(log => log.timestamp >= last24Hours).length;
	const avgDuration = recentLogs.reduce((sum, log) => sum + (log.details?.duration || 0), 0) / recentLogs.length || 0;
	const errorRate = recentLogs.filter(log => (log.details?.statusCode || 0) >= 400).length / recentLogs.length || 0;

	return {
		clientId: client.clientId,
		clientName: client.clientName,
		totalRequests: client.totalRequests,
		requestsLast24h,
		avgDuration: Math.round(avgDuration),
		errorRate: Math.round(errorRate * 100),
		lastUsedAt: client.lastUsedAt,
		isActive: client.isActive
	};
}
