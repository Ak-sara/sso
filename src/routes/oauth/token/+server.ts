import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tokenSchema } from '$lib/validation.js';
import { oauthStore } from '$lib/store.js';
import { generateAccessToken, generateRefreshToken, createJWT, verifyCodeChallenge } from '$lib/crypto.js';
import { logOAuth } from '$lib/audit/logger';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ipAddress = getClientAddress();
	const userAgent = request.headers.get('user-agent') || undefined;

	try {
		const formData = await request.formData();
		const data = Object.fromEntries(formData.entries());

		console.log('🔐 Token endpoint - Received data:', {
			...data,
			client_secret: data.client_secret ? '***' : undefined
		});

		const validatedData = tokenSchema.parse(data);

		console.log('🔐 Token endpoint - Validated data:', {
			grant_type: validatedData.grant_type,
			client_id: validatedData.client_id,
			has_code: !!validatedData.code,
			has_redirect_uri: !!validatedData.redirect_uri,
			has_code_verifier: !!validatedData.code_verifier
		});

		// Verify client credentials
		const client = await oauthStore.getClient(validatedData.client_id);
		if (!client) {
			throw error(401, 'Invalid client credentials');
		}

		// Verify client secret using Argon2
		const { verify } = await import('@node-rs/argon2');
		const isValidSecret = await verify(client.client_secret, validatedData.client_secret);
		if (!isValidSecret) {
			throw error(401, 'Invalid client credentials');
		}

		if (validatedData.grant_type === 'authorization_code') {
			if (!validatedData.code || !validatedData.redirect_uri) {
				throw error(400, 'Missing required parameters for authorization_code grant');
			}

			// Verify authorization code
			const authCode = await oauthStore.getAuthCode(validatedData.code);
			if (!authCode) {
				throw error(400, 'Invalid authorization code');
			}

			// Check if code has expired
			if (authCode.expires_at < new Date()) {
				await oauthStore.deleteAuthCode(validatedData.code);
				throw error(400, 'Authorization code has expired');
			}

			// Verify client and redirect URI match
			if (authCode.client_id !== validatedData.client_id || 
				authCode.redirect_uri !== validatedData.redirect_uri) {
				throw error(400, 'Invalid client or redirect URI');
			}

			// Verify PKCE if present
			if (authCode.code_challenge && validatedData.code_verifier) {
				if (!verifyCodeChallenge(validatedData.code_verifier, authCode.code_challenge)) {
					throw error(400, 'Invalid code verifier');
				}
			}

			// Get user info
			const user = await oauthStore.getUserById(authCode.identity_id);
			if (!user) {
				throw error(400, 'User not found');
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
				const idTokenPayload = {
					sub: user.id,
					email: user.email,
					name: user.name,
					aud: validatedData.client_id
				};
				idToken = createJWT(idTokenPayload, '1h');
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
			await logOAuth(
				'oauth_token_grant',
				authCode.identity_id,
				{
					clientId: validatedData.client_id,
					clientName: client.client_name,
					scope: authCode.scope,
					grantType: 'authorization_code',
					ipAddress,
					userAgent
				}
			);

			return json(response);

		} else if (validatedData.grant_type === 'refresh_token') {
			if (!validatedData.refresh_token) {
				throw error(400, 'Missing refresh token');
			}

			// Verify refresh token
			const storedRefreshToken = await oauthStore.getRefreshToken(validatedData.refresh_token);
			if (!storedRefreshToken) {
				throw error(401, 'Invalid refresh token');
			}

			// Check if refresh token has expired
			if (storedRefreshToken.expires_at < new Date()) {
				await oauthStore.deleteRefreshToken(validatedData.refresh_token);
				throw error(401, 'Refresh token has expired');
			}

			// Verify client matches
			if (storedRefreshToken.client_id !== validatedData.client_id) {
				throw error(401, 'Invalid client');
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
			await logOAuth(
				'oauth_token_refresh',
				storedRefreshToken.identity_id,
				{
					clientId: validatedData.client_id,
					clientName: client.client_name,
					grantType: 'refresh_token',
					ipAddress,
					userAgent
				}
			);

			return json({
				access_token: accessToken,
				token_type: 'Bearer',
				expires_in: expiresIn
			});
		}

		throw error(400, 'Unsupported grant type');

	} catch (err) {
		if (err instanceof Error) {
			throw error(400, err.message);
		}
		throw error(400, 'Invalid request');
	}
};