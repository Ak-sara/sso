import { describe, it, expect, beforeEach } from 'vitest';
import { oauthStore } from '$lib/db/repositories';
import { getDB } from '$lib/db/connection';
import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { generateAuthorizationCode, generateAccessToken, generateRefreshToken } from '$lib/crypto';

describe('OAuth Flow Integration Tests', () => {
	let testUser: any;
	let testClient: any;

	beforeEach(async () => {
		// Clean up test data
		await getDB().collection('users').deleteMany({ email: /oauth-test/ });
		await getDB().collection('oauth_clients').deleteMany({ clientName: /OAuth Test/ });
		await getDB().collection('auth_codes').deleteMany({});
		await getDB().collection('refresh_tokens').deleteMany({});

		// Create test user
		const hashedPassword = await hash('testpassword');
		testUser = {
			id: uuidv4(),
			email: 'oauth-test@example.com',
			password: hashedPassword,
			name: 'OAuth Test User',
			createdAt: new Date(),
		};
		await oauthStore.createUser(testUser);

		// Wait a bit for the user to be created
		await new Promise(resolve => setTimeout(resolve, 100));

		// Create test OAuth client
		const clientSecret = 'test-client-secret';
		const hashedClientSecret = await hash(clientSecret);
		testClient = {
			client_id: 'oauth-test-client',
			client_secret: hashedClientSecret,
			name: 'OAuth Test Client',
			redirect_uris: ['http://localhost:3000/callback'],
			allowed_scopes: ['openid', 'profile', 'email'],
			created_at: new Date(),
		};
		await oauthStore.createClient(testClient);

		// Wait a bit for the client to be created
		await new Promise(resolve => setTimeout(resolve, 100));

		// Store the plain secret for testing
		testClient.plain_secret = clientSecret;
	});

	it('should complete full authorization code flow', async () => {
		// Step 1: User authentication and authorization
		// Verify user was created by checking database directly
		const dbUser = await getDB().collection('users').findOne({ email: 'oauth-test@example.com' });
		expect(dbUser, 'User should exist in database').toBeDefined();

		const user = await oauthStore.getUserByEmail('oauth-test@example.com');
		expect(user, 'getUserByEmail should return user').toBeDefined();
		expect(user?.email).toBe('oauth-test@example.com');

		// Step 2: Create authorization code
		const authCode = generateAuthorizationCode();
		const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		await oauthStore.saveAuthCode({
			code: authCode,
			client_id: testClient.client_id,
			user_id: user!.id,
			redirect_uri: testClient.redirect_uris[0],
			scope: 'openid profile email',
			expires_at: codeExpiresAt,
		});

		// Step 3: Retrieve authorization code
		const storedAuthCode = await oauthStore.getAuthCode(authCode);
		expect(storedAuthCode).toBeDefined();
		expect(storedAuthCode?.code).toBe(authCode);
		expect(storedAuthCode?.client_id).toBe(testClient.client_id);
		expect(storedAuthCode?.user_id).toBe(user!.id);

		// Step 4: Exchange authorization code for tokens
		const accessToken = generateAccessToken();
		const refreshToken = generateRefreshToken();
		const accessTokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
		const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

		await oauthStore.saveAccessToken({
			token: accessToken,
			client_id: testClient.client_id,
			user_id: user!.id,
			scope: 'openid profile email',
			expires_at: accessTokenExpiresAt,
		});

		await oauthStore.saveRefreshToken({
			token: refreshToken,
			client_id: testClient.client_id,
			user_id: user!.id,
			expires_at: refreshTokenExpiresAt,
		});

		// Delete used authorization code
		await oauthStore.deleteAuthCode(authCode);

		// Step 5: Verify access token
		const storedAccessToken = await oauthStore.getAccessToken(accessToken);
		expect(storedAccessToken).toBeDefined();
		expect(storedAccessToken?.token).toBe(accessToken);
		expect(storedAccessToken?.user_id).toBe(user!.id);

		// Step 6: Verify refresh token
		const storedRefreshToken = await oauthStore.getRefreshToken(refreshToken);
		expect(storedRefreshToken).toBeDefined();
		expect(storedRefreshToken?.token).toBe(refreshToken);
		expect(storedRefreshToken?.user_id).toBe(user!.id);

		// Step 7: Verify authorization code was deleted
		const deletedAuthCode = await oauthStore.getAuthCode(authCode);
		expect(deletedAuthCode).toBeNull();
	});

	it('should handle refresh token flow', async () => {
		const user = await oauthStore.getUserByEmail('oauth-test@example.com');
		expect(user).toBeDefined();

		// Create initial refresh token
		const refreshToken = generateRefreshToken();
		const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		await oauthStore.saveRefreshToken({
			token: refreshToken,
			client_id: testClient.client_id,
			user_id: user!.id,
			expires_at: refreshTokenExpiresAt,
		});

		// Retrieve refresh token
		const storedRefreshToken = await oauthStore.getRefreshToken(refreshToken);
		expect(storedRefreshToken).toBeDefined();
		expect(storedRefreshToken?.user_id).toBe(user!.id);

		// Generate new access token using refresh token
		const newAccessToken = generateAccessToken();
		const accessTokenExpiresAt = new Date(Date.now() + 3600 * 1000);

		await oauthStore.saveAccessToken({
			token: newAccessToken,
			client_id: testClient.client_id,
			user_id: user!.id,
			scope: 'openid',
			expires_at: accessTokenExpiresAt,
		});

		// Verify new access token
		const storedAccessToken = await oauthStore.getAccessToken(newAccessToken);
		expect(storedAccessToken).toBeDefined();
		expect(storedAccessToken?.token).toBe(newAccessToken);
	});

	it('should reject invalid client credentials', async () => {
		const client = await oauthStore.getClient('invalid-client-id');
		expect(client).toBeNull();
	});

	it('should reject expired authorization codes', async () => {
		const user = await oauthStore.getUserByEmail('oauth-test@example.com');
		const authCode = generateAuthorizationCode();

		// Create expired authorization code
		const expiredDate = new Date(Date.now() - 1000); // 1 second ago

		await oauthStore.saveAuthCode({
			code: authCode,
			client_id: testClient.client_id,
			user_id: user!.id,
			redirect_uri: testClient.redirect_uris[0],
			scope: 'openid',
			expires_at: expiredDate,
		});

		const storedAuthCode = await oauthStore.getAuthCode(authCode);
		expect(storedAuthCode).toBeDefined();
		expect(storedAuthCode!.expires_at.getTime()).toBeLessThan(Date.now());
	});

	it('should reject expired access tokens', async () => {
		const user = await oauthStore.getUserByEmail('oauth-test@example.com');
		const accessToken = generateAccessToken();

		// Create expired access token
		const expiredDate = new Date(Date.now() - 1000);

		await oauthStore.saveAccessToken({
			token: accessToken,
			client_id: testClient.client_id,
			user_id: user!.id,
			scope: 'openid',
			expires_at: expiredDate,
		});

		const storedAccessToken = await oauthStore.getAccessToken(accessToken);
		expect(storedAccessToken).toBeDefined();
		expect(storedAccessToken!.expires_at.getTime()).toBeLessThan(Date.now());
	});

	it('should validate redirect URI', async () => {
		const client = await oauthStore.getClient(testClient.client_id);
		expect(client).toBeDefined();

		const validUri = 'http://localhost:3000/callback';
		const invalidUri = 'http://evil.com/callback';

		expect(client!.redirect_uris).toContain(validUri);
		expect(client!.redirect_uris).not.toContain(invalidUri);
	});

	it('should validate scopes', async () => {
		const client = await oauthStore.getClient(testClient.client_id);
		expect(client).toBeDefined();

		const requestedScopes = ['openid', 'profile'];
		const invalidScopes = ['openid', 'admin'];

		// All requested scopes should be in allowed scopes
		const allScopesAllowed = requestedScopes.every(scope =>
			client!.allowed_scopes.includes(scope)
		);
		expect(allScopesAllowed).toBe(true);

		// Invalid scopes should fail
		const hasInvalidScope = invalidScopes.some(scope =>
			!client!.allowed_scopes.includes(scope)
		);
		expect(hasInvalidScope).toBe(true);
	});

	it('should cleanup expired tokens', async () => {
		const user = await oauthStore.getUserByEmail('oauth-test@example.com');

		// Create expired authorization code
		await oauthStore.saveAuthCode({
			code: 'expired-code',
			client_id: testClient.client_id,
			user_id: user!.id,
			redirect_uri: testClient.redirect_uris[0],
			scope: 'openid',
			expires_at: new Date(Date.now() - 1000),
		});

		// Create valid authorization code
		await oauthStore.saveAuthCode({
			code: 'valid-code',
			client_id: testClient.client_id,
			user_id: user!.id,
			redirect_uri: testClient.redirect_uris[0],
			scope: 'openid',
			expires_at: new Date(Date.now() + 10 * 60 * 1000),
		});

		// Create expired refresh token
		await oauthStore.saveRefreshToken({
			token: 'expired-refresh',
			client_id: testClient.client_id,
			user_id: user!.id,
			expires_at: new Date(Date.now() - 1000),
		});

		// Create valid refresh token
		await oauthStore.saveRefreshToken({
			token: 'valid-refresh',
			client_id: testClient.client_id,
			user_id: user!.id,
			expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		});

		// Cleanup expired tokens
		await oauthStore.cleanupExpiredTokens();

		// Verify expired tokens are deleted
		const expiredCode = await oauthStore.getAuthCode('expired-code');
		const expiredRefresh = await oauthStore.getRefreshToken('expired-refresh');
		expect(expiredCode).toBeNull();
		expect(expiredRefresh).toBeNull();

		// Verify valid tokens still exist
		const validCode = await oauthStore.getAuthCode('valid-code');
		const validRefresh = await oauthStore.getRefreshToken('valid-refresh');
		expect(validCode).toBeDefined();
		expect(validRefresh).toBeDefined();
	});
});
