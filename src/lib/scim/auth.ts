/**
 * SCIM Authentication Middleware
 * Bearer token authentication for SCIM endpoints
 */

import { error, type RequestEvent } from '@sveltejs/kit';
import { createScimError } from './utils';
import { SCIM_SCHEMAS } from './schemas';

/**
 * SCIM Bearer Tokens
 * In production, these should be:
 * 1. Stored in database with expiry
 * 2. Generated per client application
 * 3. Rotatable
 * 4. Scoped with permissions
 *
 * For now, we use a simple static token for testing
 */
const SCIM_BEARER_TOKENS = new Set([
	'scim-token-12345', // Default token for testing
	process.env.SCIM_BEARER_TOKEN // Token from environment
].filter(Boolean));

/**
 * Validate SCIM Bearer token
 */
export function validateScimAuth(event: RequestEvent): boolean {
	const authHeader = event.request.headers.get('Authorization');

	if (!authHeader) {
		return false;
	}

	// Check for Bearer token
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	if (!match) {
		return false;
	}

	const token = match[1];
	return SCIM_BEARER_TOKENS.has(token);
}

/**
 * Require SCIM authentication
 * Throws 401 error if authentication fails
 */
export function requireScimAuth(event: RequestEvent): void {
	if (!validateScimAuth(event)) {
		throw error(
			401,
			JSON.stringify(
				createScimError(
					401,
					'Authentication failed. Valid Bearer token required.',
					undefined
				)
			)
		);
	}
}

/**
 * Add SCIM Bearer token
 * For admin UI to generate/manage tokens
 */
export function addScimToken(token: string): void {
	SCIM_BEARER_TOKENS.add(token);
}

/**
 * Remove SCIM Bearer token
 */
export function removeScimToken(token: string): void {
	SCIM_BEARER_TOKENS.delete(token);
}

/**
 * List all SCIM tokens (masked)
 */
export function listScimTokens(): string[] {
	return Array.from(SCIM_BEARER_TOKENS).map((token) => {
		if (token.length <= 8) return '********';
		return token.slice(0, 4) + '****' + token.slice(-4);
	});
}
