import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tokenSchema } from '$lib/validation.js';
import { oauthStore } from '$lib/store.js';
import { generateAccessToken, generateRefreshToken, createJWT, verifyCodeChallenge } from '$lib/crypto.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const data = Object.fromEntries(formData.entries());
		const validatedData = tokenSchema.parse(data);

		// Verify client credentials
		const client = await oauthStore.getClient(validatedData.client_id);
		if (!client || client.client_secret !== validatedData.client_secret) {
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
			const user = await oauthStore.getUserById(authCode.user_id);
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
				user_id: authCode.user_id,
				scope: authCode.scope,
				expires_at: accessTokenExpiresAt
			});

			await oauthStore.saveRefreshToken({
				token: refreshToken,
				client_id: validatedData.client_id,
				user_id: authCode.user_id,
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
					aud: validatedData.client_id,
					iat: Math.floor(Date.now() / 1000),
					exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
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
				user_id: storedRefreshToken.user_id,
				scope: 'openid', // Default scope for refresh
				expires_at: accessTokenExpiresAt
			});

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