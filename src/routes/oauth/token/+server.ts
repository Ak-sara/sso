import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tokenSchema } from '$lib/validation.js';
import { oauthStore } from '$lib/store.js';
import { generateAccessToken, generateRefreshToken, verifyCodeChallenge } from '$lib/crypto.js';
import { createIdToken } from '$lib/auth/id-token';
import { oauthError } from '$lib/oauth/errors';
import { canIdentityAccessClient, getClientRoleNames } from '$lib/auth/realm-access';
import { logAudit } from '$lib/audit/logger';
import { useLogger } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'oauth:token' });

/** RFC 6749 §2.3.1 — client_secret_basic: `Authorization: Basic base64(client_id:client_secret)`. */
function parseBasicAuth(header: string | null): { client_id: string; client_secret: string } | null {
	if (!header?.startsWith('Basic ')) return null;
	try {
		const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
		const sep = decoded.indexOf(':');
		if (sep === -1) return null;
		const client_id = decodeURIComponent(decoded.slice(0, sep));
		const client_secret = decodeURIComponent(decoded.slice(sep + 1));
		if (!client_id || !client_secret) return null;
		return { client_id, client_secret };
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ locals, getClientAddress, url }) => {
	const ipAddress = getClientAddress();
	const userAgent = locals.vars.user_agent;

	const data: Record<string, unknown> = { ...locals.body };
	// client_secret_basic — only fills in what the body (client_secret_post) didn't already provide
	const basicAuth = parseBasicAuth(locals.headers.get('authorization'));
	if (basicAuth) {
		data.client_id ??= basicAuth.client_id;
		data.client_secret ??= basicAuth.client_secret;
	}

	log.debug('Token endpoint - Received data', {
		...data,
		client_secret: data?.client_secret ? '***' : undefined
	});

	const parsed = tokenSchema.safeParse(data);
	if (!parsed.success) {
		return oauthError(400, 'invalid_request', parsed.error.issues.map((i) => i.message).join('; '));
	}
	const validatedData = parsed.data;

	log.debug('Token endpoint - Validated data', {
		grant_type: validatedData.grant_type,
		client_id: validatedData.client_id,
		has_code: !!validatedData.code,
		has_redirect_uri: !!validatedData.redirect_uri,
		has_code_verifier: !!validatedData.code_verifier
	});

	// Verify client credentials
	const client = await oauthStore.getClient(validatedData.client_id);
	if (!client) {
		return oauthError(401, 'invalid_client', 'Unknown client_id');
	}

	// Verify client secret using Argon2
	const { verify } = await import('@node-rs/argon2');
	const isValidSecret = await verify(client.client_secret, validatedData.client_secret);
	if (!isValidSecret) {
		return oauthError(401, 'invalid_client', 'Client secret does not match');
	}

	if (validatedData.grant_type === 'authorization_code') {
		if (!validatedData.code || !validatedData.redirect_uri) {
			return oauthError(400, 'invalid_request', 'code and redirect_uri are required for authorization_code grant');
		}

		// Verify authorization code
		const authCode = await oauthStore.getAuthCode(validatedData.code);
		if (!authCode) {
			return oauthError(400, 'invalid_grant', 'Invalid authorization code');
		}

		// Check if code has expired
		if (authCode.expires_at < new Date()) {
			await oauthStore.deleteAuthCode(validatedData.code);
			return oauthError(400, 'invalid_grant', 'Authorization code has expired');
		}

		// Verify client and redirect URI match
		if (authCode.client_id !== validatedData.client_id ||
			authCode.redirect_uri !== validatedData.redirect_uri) {
			return oauthError(400, 'invalid_grant', 'Authorization code was not issued to this client/redirect_uri');
		}

		// Verify PKCE if present
		if (authCode.code_challenge) {
			if (!validatedData.code_verifier) {
				return oauthError(400, 'invalid_grant', 'code_verifier is required — this authorization code was issued with PKCE');
			}
			if (!verifyCodeChallenge(validatedData.code_verifier, authCode.code_challenge)) {
				return oauthError(400, 'invalid_grant', 'code_verifier does not match the code_challenge');
			}
		}

		// Get user info
		const user = await oauthStore.getUserById(authCode.identity_id);
		if (!user) {
			return oauthError(400, 'invalid_grant', 'User associated with this authorization code no longer exists');
		}

		// Re-check realm access — the assignment/role could have changed between
		// /oauth/authorize and this exchange
		if (!(await canIdentityAccessClient(authCode.identity_id, validatedData.client_id))) {
			return oauthError(400, 'invalid_grant', 'This identity is no longer authorized for this client');
		}

		// Generate tokens
		const accessToken = generateAccessToken();
		const refreshToken = generateRefreshToken();
		const expiresIn = 3600; // 1 hour
		const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
		const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

		// Save tokens
		await oauthStore.saveAccessToken({
			token: accessToken,
			client_id: validatedData.client_id,
			identity_id: authCode.identity_id,
			scope: authCode.scope,
			expires_at: accessTokenExpiresAt
		});

		await oauthStore.saveRefreshToken({
			token: refreshToken,
			client_id: validatedData.client_id,
			identity_id: authCode.identity_id,
			expires_at: refreshTokenExpiresAt
		});

		// Delete used authorization code
		await oauthStore.deleteAuthCode(validatedData.code);

		// Create ID token if openid scope is present
		let idToken: string | null = null;
		if (authCode.scope.includes('openid')) {
			const roles = await getClientRoleNames(authCode.identity_id, validatedData.client_id);
			idToken = await createIdToken({
				sub: user.id,
				email: user.email,
				name: user.name,
				aud: validatedData.client_id,
				...(roles.length > 0 && { roles })
			}, `${url.protocol}//${url.host}`);
		}

		const response: {
			access_token: string;
			token_type: string;
			expires_in: number;
			refresh_token: string;
			scope: string;
			id_token?: string;
		} = {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: expiresIn,
			refresh_token: refreshToken,
			scope: authCode.scope
		};

		if (idToken) {
			response.id_token = idToken;
		}

		// Log OAuth token grant
		await logAudit({ action: 'oauth_token_grant', resource: 'tokens', identityId: authCode.identity_id, resourceId: validatedData.client_id, details: { clientName: client.name, scope: authCode.scope, grantType: 'authorization_code' }, ipAddress, userAgent });

		return json(response);

	} else if (validatedData.grant_type === 'refresh_token') {
		if (!validatedData.refresh_token) {
			return oauthError(400, 'invalid_request', 'refresh_token is required');
		}

		// Verify refresh token
		const storedRefreshToken = await oauthStore.getRefreshToken(validatedData.refresh_token);
		if (!storedRefreshToken) {
			return oauthError(401, 'invalid_grant', 'Invalid refresh token');
		}

		// Check if refresh token has expired
		if (storedRefreshToken.expires_at < new Date()) {
			await oauthStore.deleteRefreshToken(validatedData.refresh_token);
			return oauthError(401, 'invalid_grant', 'Refresh token has expired');
		}

		// Verify client matches
		if (storedRefreshToken.client_id !== validatedData.client_id) {
			return oauthError(401, 'invalid_grant', 'Refresh token was not issued to this client');
		}

		// Re-check realm access on every refresh — assignments/roles can change
		// (mutation, offboarding) after the token was first issued
		if (!(await canIdentityAccessClient(storedRefreshToken.identity_id, validatedData.client_id))) {
			await oauthStore.deleteRefreshToken(validatedData.refresh_token);
			return oauthError(401, 'invalid_grant', 'This identity is no longer authorized for this client');
		}

		// Generate new access token
		const accessToken = generateAccessToken();
		const expiresIn = 3600; // 1 hour
		const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

		// Save new access token
		await oauthStore.saveAccessToken({
			token: accessToken,
			client_id: validatedData.client_id,
			identity_id: storedRefreshToken.identity_id,
			scope: 'openid', // Default scope for refresh
			expires_at: accessTokenExpiresAt
		});

		// Log OAuth token refresh
		await logAudit({ action: 'oauth_token_refresh', resource: 'tokens', identityId: storedRefreshToken.identity_id, resourceId: validatedData.client_id, details: { clientName: client.name, grantType: 'refresh_token' }, ipAddress, userAgent });

		return json({
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: expiresIn
		});
	}

	return oauthError(400, 'unsupported_grant_type', `grant_type '${validatedData.grant_type}' is not supported`);
};
