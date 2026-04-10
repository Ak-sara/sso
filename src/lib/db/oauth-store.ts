/**
 * OAuth Store — facade that maps snake_case OAuth interface ↔ camelCase DB.
 * Uses db.* repositories internally. Keeps the AccessToken in-memory Map.
 */

import { db } from './db';
import { findIdentityByEmailOrNIK } from './schemas/identity';

// ── In-memory access token storage ──────────────────────────────────

export interface AccessToken {
	token: string;
	clientId: string;
	identityId: string;
	scope: string;
	expiresAt: Date;
}

const accessTokens = new Map<string, AccessToken>();

export class AccessTokenRepository {
	async save(accessToken: AccessToken): Promise<void> {
		accessTokens.set(accessToken.token, accessToken);
	}

	async findByToken(token: string): Promise<AccessToken | null> {
		return accessTokens.get(token) || null;
	}

	async delete(token: string): Promise<void> {
		accessTokens.delete(token);
	}

	async deleteExpired(): Promise<void> {
		const now = new Date();
		for (const [token, at] of accessTokens.entries()) {
			if (at.expiresAt < now) accessTokens.delete(token);
		}
	}
}

// ── OAuth Store class ───────────────────────────────────────────────

export class OAuthStore {
	private accessTokenRepo = new AccessTokenRepository();

	// Identity helpers (maps camelCase DB → snake_case OAuth interface)
	async getUserById(id: string): Promise<{ id: string; email: string; password: string; name: string; createdAt: Date } | null> {
		const identity = await db.identities.findById(id);
		if (!identity) return null;
		return {
			id: identity._id!.toString(),
			email: identity.email || '',
			password: identity.password,
			name: identity.fullName || `${identity.firstName || ''} ${identity.lastName || ''}`.trim(),
			createdAt: identity.createdAt,
		};
	}

	async getUserByEmailOrNIK(identifier: string): Promise<{ id: string; email: string; password: string; name: string; createdAt: Date } | null> {
		const identity = await findIdentityByEmailOrNIK(identifier);
		if (!identity) return null;
		return {
			id: identity._id!.toString(),
			email: identity.email || identifier,
			password: identity.password,
			name: identity.fullName || `${identity.firstName || ''} ${identity.lastName || ''}`.trim(),
			createdAt: identity.createdAt,
		};
	}

	// Client methods
	async getClient(clientId: string): Promise<{ client_id: string; client_secret: string; name: string; redirect_uris: string[]; allowed_scopes: string[]; created_at: Date } | null> {
		const client = await db.oauthClients.findOne({ clientId });
		if (!client) return null;
		return {
			client_id: client.clientId,
			client_secret: client.clientSecret,
			name: client.clientName,
			redirect_uris: client.redirectUris,
			allowed_scopes: client.allowedScopes,
			created_at: client.createdAt,
		};
	}

	// Auth code methods
	async saveAuthCode(authCode: { code: string; client_id: string; identity_id: string; redirect_uri: string; scope: string; expires_at: Date; code_challenge?: string; code_challenge_method?: string }): Promise<void> {
		await db.authCodes.insertOne({
			code: authCode.code,
			clientId: authCode.client_id,
			identityId: authCode.identity_id,
			redirectUri: authCode.redirect_uri,
			scope: authCode.scope,
			codeChallenge: authCode.code_challenge,
			codeChallengeMethod: authCode.code_challenge_method,
			expiresAt: authCode.expires_at,
		} as any);
	}

	async getAuthCode(code: string): Promise<{ code: string; client_id: string; identity_id: string; redirect_uri: string; scope: string; expires_at: Date; code_challenge?: string; code_challenge_method?: string } | null> {
		const ac = await db.authCodes.findOne({ code });
		if (!ac) return null;
		return {
			code: ac.code,
			client_id: ac.clientId,
			identity_id: ac.identityId,
			redirect_uri: ac.redirectUri,
			scope: ac.scope,
			expires_at: ac.expiresAt,
			code_challenge: ac.codeChallenge,
			code_challenge_method: ac.codeChallengeMethod,
		};
	}

	async deleteAuthCode(code: string): Promise<void> {
		await db.authCodes.deleteOne({ code });
	}

	// Access token methods (in-memory)
	async saveAccessToken(token: { token: string; client_id: string; identity_id: string; scope: string; expires_at: Date }): Promise<void> {
		await this.accessTokenRepo.save({
			token: token.token,
			clientId: token.client_id,
			identityId: token.identity_id,
			scope: token.scope,
			expiresAt: token.expires_at,
		});
	}

	async getAccessToken(token: string): Promise<{ token: string; client_id: string; identity_id: string; scope: string; expires_at: Date } | null> {
		const at = await this.accessTokenRepo.findByToken(token);
		if (!at) return null;
		return {
			token: at.token,
			client_id: at.clientId,
			identity_id: at.identityId,
			scope: at.scope,
			expires_at: at.expiresAt,
		};
	}

	// Refresh token methods
	async saveRefreshToken(token: { token: string; client_id: string; identity_id: string; expires_at: Date }): Promise<void> {
		await db.refreshTokens.insertOne({
			token: token.token,
			clientId: token.client_id,
			identityId: token.identity_id,
			scope: 'openid',
			expiresAt: token.expires_at,
		} as any);
	}

	async getRefreshToken(token: string): Promise<{ token: string; client_id: string; identity_id: string; expires_at: Date } | null> {
		const rt = await db.refreshTokens.findOne({ token });
		if (!rt) return null;
		return {
			token: rt.token,
			client_id: rt.clientId,
			identity_id: rt.identityId,
			expires_at: rt.expiresAt,
		};
	}

	async deleteRefreshToken(token: string): Promise<void> {
		await db.refreshTokens.deleteOne({ token });
	}

	// Cleanup
	async cleanupExpiredTokens(): Promise<void> {
		await Promise.all([
			db.authCodes.deleteOne({ expiresAt: { $lt: new Date() } } as any),
			this.accessTokenRepo.deleteExpired(),
			db.refreshTokens.deleteOne({ expiresAt: { $lt: new Date() } } as any),
		]);
	}
}

export const oauthStore = new OAuthStore();
