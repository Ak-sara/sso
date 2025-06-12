import type { User, Client, AuthorizationCode, AccessToken, RefreshToken } from './types.js';

// In-memory storage - replace with database in production
export class OAuthStore {
	private users = new Map<string, User>();
	private clients = new Map<string, Client>();
	private authCodes = new Map<string, AuthorizationCode>();
	private accessTokens = new Map<string, AccessToken>();
	private refreshTokens = new Map<string, RefreshToken>();

	// User methods
	async createUser(user: User): Promise<void> {
		this.users.set(user.id, user);
	}

	async getUserById(id: string): Promise<User | null> {
		return this.users.get(id) || null;
	}

	async getUserByEmail(email: string): Promise<User | null> {
		for (const user of this.users.values()) {
			if (user.email === email) return user;
		}
		return null;
	}

	// Client methods
	async createClient(client: Client): Promise<void> {
		this.clients.set(client.client_id, client);
	}

	async getClient(clientId: string): Promise<Client | null> {
		return this.clients.get(clientId) || null;
	}

	// Authorization code methods
	async saveAuthCode(authCode: AuthorizationCode): Promise<void> {
		this.authCodes.set(authCode.code, authCode);
	}

	async getAuthCode(code: string): Promise<AuthorizationCode | null> {
		return this.authCodes.get(code) || null;
	}

	async deleteAuthCode(code: string): Promise<void> {
		this.authCodes.delete(code);
	}

	// Access token methods
	async saveAccessToken(token: AccessToken): Promise<void> {
		this.accessTokens.set(token.token, token);
	}

	async getAccessToken(token: string): Promise<AccessToken | null> {
		return this.accessTokens.get(token) || null;
	}

	// Refresh token methods
	async saveRefreshToken(token: RefreshToken): Promise<void> {
		this.refreshTokens.set(token.token, token);
	}

	async getRefreshToken(token: string): Promise<RefreshToken | null> {
		return this.refreshTokens.get(token) || null;
	}

	async deleteRefreshToken(token: string): Promise<void> {
		this.refreshTokens.delete(token);
	}

	// Cleanup expired tokens
	async cleanupExpiredTokens(): Promise<void> {
		const now = new Date();
		
		for (const [code, authCode] of this.authCodes.entries()) {
			if (authCode.expires_at < now) {
				this.authCodes.delete(code);
			}
		}

		for (const [token, accessToken] of this.accessTokens.entries()) {
			if (accessToken.expires_at < now) {
				this.accessTokens.delete(token);
			}
		}

		for (const [token, refreshToken] of this.refreshTokens.entries()) {
			if (refreshToken.expires_at < now) {
				this.refreshTokens.delete(token);
			}
		}
	}
}

export const oauthStore = new OAuthStore();

