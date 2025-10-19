/**
 * Enhanced SCIM Authentication
 * OAuth 2.0 Bearer Token with per-client credentials (Okta-style)
 */

import { error, type RequestEvent } from '@sveltejs/kit';
import { hash, verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import { getDB } from '$lib/db/connection';
import type { ScimClient, ScimAccessToken, ScimAuditLog } from '$lib/db/schemas';
import { ObjectId } from 'mongodb';
import { createScimError } from './utils';
import { randomBytes } from 'crypto';

const JWT_SECRET = new TextEncoder().encode(
	process.env.SCIM_JWT_SECRET || 'your-secret-key-change-in-production'
);

// Rate limiting: in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

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
	const db = getDB();

	// Generate client ID and secret
	const clientId = `scim-${randomBytes(8).toString('hex')}`; // e.g., "scim-a1b2c3d4e5f6g7h8"
	const plainSecret = randomBytes(32).toString('base64'); // 256-bit secret
	const hashedSecret = await hash(plainSecret);

	const client: Omit<ScimClient, '_id'> = {
		clientId,
		clientName: data.clientName,
		clientSecret: hashedSecret,
		organizationId: data.organizationId ? new ObjectId(data.organizationId) : undefined,
		scopes: data.scopes || ['read:users', 'read:groups'],
		accessTokenExpiresIn: 3600, // 1 hour
		rateLimit: data.rateLimit || 100, // 100 requests/minute
		ipWhitelist: data.ipWhitelist,
		isActive: true,
		description: data.description,
		contactEmail: data.contactEmail,
		totalRequests: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		createdBy: data.createdBy
	};

	const result = await db.collection<ScimClient>('scim_clients').insertOne(client as any);

	return {
		client: { ...client, _id: result.insertedId } as ScimClient,
		plainSecret // Return ONLY ONCE - never stored in plain text!
	};
}

/**
 * Authenticate SCIM client and issue JWT token (like OAuth 2.0 client credentials flow)
 */
export async function authenticateScimClient(
	clientId: string,
	clientSecret: string
): Promise<string> {
	const db = getDB();

	// Find client
	const client = await db.collection<ScimClient>('scim_clients').findOne({ clientId });

	if (!client || !client.isActive) {
		throw error(401, 'Invalid client credentials');
	}

	// Verify secret
	const isValid = await verify(client.clientSecret, clientSecret);
	if (!isValid) {
		throw error(401, 'Invalid client credentials');
	}

	// Generate JWT access token
	const token = await new SignJWT({
		client_id: clientId,
		scopes: client.scopes
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${client.accessTokenExpiresIn}s`)
		.setSubject(clientId)
		.sign(JWT_SECRET);

	// Store token in database
	const accessToken: Omit<ScimAccessToken, '_id'> = {
		token,
		clientId,
		scopes: client.scopes as any,
		expiresAt: new Date(Date.now() + client.accessTokenExpiresIn * 1000),
		isRevoked: false,
		createdAt: new Date()
	};

	await db.collection<ScimAccessToken>('scim_access_tokens').insertOne(accessToken as any);

	// Update last used
	await db.collection<ScimClient>('scim_clients').updateOne(
		{ clientId },
		{
			$set: { lastUsedAt: new Date() }
		}
	);

	return token;
}

/**
 * Validate SCIM Bearer token and extract client info
 */
export async function validateScimToken(
	token: string
): Promise<{ clientId: string; scopes: string[] }> {
	const db = getDB();

	try {
		// Verify JWT signature and expiration
		const { payload } = await jwtVerify(token, JWT_SECRET);

		const clientId = payload.sub as string;
		const scopes = payload.scopes as string[];

		// Check if token is revoked
		const tokenRecord = await db
			.collection<ScimAccessToken>('scim_access_tokens')
			.findOne({ token, isRevoked: false });

		if (!tokenRecord) {
			throw new Error('Token revoked or not found');
		}

		// Check if client is still active
		const client = await db.collection<ScimClient>('scim_clients').findOne({ clientId });

		if (!client || !client.isActive) {
			throw new Error('Client inactive');
		}

		return { clientId, scopes };
	} catch (err) {
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
	const db = getDB();
	const client = await db.collection<ScimClient>('scim_clients').findOne({ clientId });

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
 * Check rate limit (sliding window)
 */
async function checkRateLimit(clientId: string): Promise<void> {
	const db = getDB();
	const client = await db.collection<ScimClient>('scim_clients').findOne({ clientId });

	if (!client) return;

	const now = Date.now();
	const windowMs = 60 * 1000; // 1 minute window

	// Get current count
	const current = rateLimitStore.get(clientId);

	if (current && current.resetAt > now) {
		// Within window
		if (current.count >= client.rateLimit) {
			const resetInSeconds = Math.ceil((current.resetAt - now) / 1000);
			throw error(
				429,
				JSON.stringify(
					createScimError(
						429,
						`Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
						'tooMany'
					)
				)
			);
		}
		current.count++;
	} else {
		// New window
		rateLimitStore.set(clientId, {
			count: 1,
			resetAt: now + windowMs
		});
	}

	// Update total requests count
	await db.collection<ScimClient>('scim_clients').updateOne(
		{ clientId },
		{
			$inc: { totalRequests: 1 },
			$set: { lastUsedAt: new Date() }
		}
	);
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
	const db = getDB();

	const auditLog: Omit<ScimAuditLog, '_id'> = {
		...data,
		timestamp: new Date()
	};

	await db.collection<ScimAuditLog>('scim_audit_logs').insertOne(auditLog as any);
}

/**
 * Revoke SCIM token
 */
export async function revokeScimToken(token: string): Promise<void> {
	const db = getDB();

	await db.collection<ScimAccessToken>('scim_access_tokens').updateOne(
		{ token },
		{ $set: { isRevoked: true } }
	);
}

/**
 * Revoke all tokens for a client
 */
export async function revokeAllClientTokens(clientId: string): Promise<void> {
	const db = getDB();

	await db.collection<ScimAccessToken>('scim_access_tokens').updateMany(
		{ clientId },
		{ $set: { isRevoked: true } }
	);
}

/**
 * Deactivate SCIM client
 */
export async function deactivateScimClient(clientId: string): Promise<void> {
	const db = getDB();

	await db.collection<ScimClient>('scim_clients').updateOne(
		{ clientId },
		{ $set: { isActive: false, updatedAt: new Date() } }
	);

	// Revoke all tokens
	await revokeAllClientTokens(clientId);
}

/**
 * Delete SCIM client (permanent)
 * Safety: Only inactive clients can be deleted
 */
export async function deleteScimClient(clientId: string): Promise<void> {
	const db = getDB();

	// Check if client exists and is inactive
	const client = await db.collection<ScimClient>('scim_clients').findOne({ clientId });

	if (!client) {
		throw error(404, 'Client not found');
	}

	if (client.isActive) {
		throw error(400, 'Cannot delete active client. Deactivate first.');
	}

	// Revoke all tokens (safety)
	await revokeAllClientTokens(clientId);

	// Delete client
	await db.collection<ScimClient>('scim_clients').deleteOne({ clientId });

	// Log deletion
	await logScimRequest({
		clientId,
		endpoint: '/scim-clients/delete',
		method: 'DELETE',
		statusCode: 200,
		ipAddress: '127.0.0.1',
		duration: 0,
		errorMessage: undefined
	});
}

/**
 * Rotate client secret
 */
export async function rotateClientSecret(
	clientId: string
): Promise<{ plainSecret: string }> {
	const db = getDB();

	const plainSecret = randomBytes(32).toString('base64');
	const hashedSecret = await hash(plainSecret);

	await db.collection<ScimClient>('scim_clients').updateOne(
		{ clientId },
		{
			$set: {
				clientSecret: hashedSecret,
				updatedAt: new Date()
			}
		}
	);

	// Revoke all existing tokens (force re-authentication)
	await revokeAllClientTokens(clientId);

	return { plainSecret };
}

/**
 * Get client usage stats
 */
export async function getClientStats(clientId: string) {
	const db = getDB();

	const client = await db.collection<ScimClient>('scim_clients').findOne({ clientId });

	if (!client) {
		throw error(404, 'Client not found');
	}

	// Get recent audit logs
	const recentLogs = await db
		.collection<ScimAuditLog>('scim_audit_logs')
		.find({ clientId })
		.sort({ timestamp: -1 })
		.limit(100)
		.toArray();

	// Calculate stats
	const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const requestsLast24h = recentLogs.filter((log) => log.timestamp >= last24Hours).length;
	const avgDuration =
		recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length || 0;
	const errorRate =
		recentLogs.filter((log) => log.statusCode >= 400).length / recentLogs.length || 0;

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
