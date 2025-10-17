import { describe, it, expect, beforeEach } from 'vitest';
import {
	UserRepository,
	OAuthClientRepository,
	AuthCodeRepository,
	RefreshTokenRepository,
	AccessTokenRepository
} from './repositories';
import { getDB } from './connection';
import { hash } from '@node-rs/argon2';

describe('UserRepository', () => {
	let userRepo: UserRepository;

	beforeEach(async () => {
		userRepo = new UserRepository();
		// Clean up test data
		await getDB().collection('users').deleteMany({ email: /test/ });
	});

	it('should create a user', async () => {
		const user = await userRepo.create({
			email: 'test@example.com',
			username: 'testuser',
			password: await hash('password123'),
			firstName: 'Test',
			lastName: 'User',
			isActive: true,
			emailVerified: false,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		expect(user._id).toBeDefined();
		expect(user.email).toBe('test@example.com');
		expect(user.username).toBe('testuser');
	});

	it('should find user by email', async () => {
		await userRepo.create({
			email: 'test2@example.com',
			username: 'testuser2',
			password: await hash('password123'),
			firstName: 'Test',
			lastName: 'User',
			isActive: true,
			emailVerified: false,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const user = await userRepo.findByEmail('test2@example.com');
		expect(user).toBeDefined();
		expect(user?.email).toBe('test2@example.com');
	});

	it('should find user by username', async () => {
		await userRepo.create({
			email: 'test3@example.com',
			username: 'testuser3',
			password: await hash('password123'),
			firstName: 'Test',
			lastName: 'User',
			isActive: true,
			emailVerified: false,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const user = await userRepo.findByUsername('testuser3');
		expect(user).toBeDefined();
		expect(user?.username).toBe('testuser3');
	});

	it('should verify password correctly', async () => {
		const password = 'password123';
		const user = await userRepo.create({
			email: 'test4@example.com',
			username: 'testuser4',
			password: await hash(password),
			firstName: 'Test',
			lastName: 'User',
			isActive: true,
			emailVerified: false,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const isValid = await userRepo.verifyPassword(user, password);
		expect(isValid).toBe(true);

		const isInvalid = await userRepo.verifyPassword(user, 'wrongpassword');
		expect(isInvalid).toBe(false);
	});
});

describe('OAuthClientRepository', () => {
	let clientRepo: OAuthClientRepository;

	beforeEach(async () => {
		clientRepo = new OAuthClientRepository();
		// Clean up test data
		await getDB().collection('oauth_clients').deleteMany({ clientName: /Test/ });
	});

	it('should create an OAuth client', async () => {
		const client = await clientRepo.create({
			clientId: 'test-client-123',
			clientSecret: await hash('test-secret'),
			clientName: 'Test Client',
			redirectUris: ['http://localhost:3000/callback'],
			allowedScopes: ['openid', 'profile'],
			grantTypes: ['authorization_code'],
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		expect(client._id).toBeDefined();
		expect(client.clientId).toBe('test-client-123');
		expect(client.clientName).toBe('Test Client');
	});

	it('should find client by clientId', async () => {
		await clientRepo.create({
			clientId: 'test-client-456',
			clientSecret: await hash('test-secret'),
			clientName: 'Test Client 2',
			redirectUris: ['http://localhost:3000/callback'],
			allowedScopes: ['openid'],
			grantTypes: ['authorization_code'],
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const client = await clientRepo.findByClientId('test-client-456');
		expect(client).toBeDefined();
		expect(client?.clientId).toBe('test-client-456');
	});

	it('should verify client secret', async () => {
		const secret = 'test-secret-123';
		const client = await clientRepo.create({
			clientId: 'test-client-789',
			clientSecret: await hash(secret),
			clientName: 'Test Client 3',
			redirectUris: ['http://localhost:3000/callback'],
			allowedScopes: ['openid'],
			grantTypes: ['authorization_code'],
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const isValid = await clientRepo.verifyClientSecret(client, secret);
		expect(isValid).toBe(true);

		const isInvalid = await clientRepo.verifyClientSecret(client, 'wrong-secret');
		expect(isInvalid).toBe(false);
	});
});

describe('AuthCodeRepository', () => {
	let authCodeRepo: AuthCodeRepository;

	beforeEach(async () => {
		authCodeRepo = new AuthCodeRepository();
		// Clean up test data
		await getDB().collection('auth_codes').deleteMany({});
	});

	it('should save and find authorization code', async () => {
		const code = 'test-auth-code-123';
		await authCodeRepo.save({
			code,
			clientId: 'test-client',
			userId: 'test-user',
			redirectUri: 'http://localhost:3000/callback',
			scope: 'openid profile',
			expiresAt: new Date(Date.now() + 10 * 60 * 1000),
			createdAt: new Date(),
		});

		const authCode = await authCodeRepo.findByCode(code);
		expect(authCode).toBeDefined();
		expect(authCode?.code).toBe(code);
		expect(authCode?.clientId).toBe('test-client');
	});

	it('should delete authorization code', async () => {
		const code = 'test-auth-code-456';
		await authCodeRepo.save({
			code,
			clientId: 'test-client',
			userId: 'test-user',
			redirectUri: 'http://localhost:3000/callback',
			scope: 'openid',
			expiresAt: new Date(Date.now() + 10 * 60 * 1000),
			createdAt: new Date(),
		});

		await authCodeRepo.delete(code);
		const authCode = await authCodeRepo.findByCode(code);
		expect(authCode).toBeNull();
	});

	it('should delete expired authorization codes', async () => {
		// Create expired code
		await authCodeRepo.save({
			code: 'expired-code',
			clientId: 'test-client',
			userId: 'test-user',
			redirectUri: 'http://localhost:3000/callback',
			scope: 'openid',
			expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
			createdAt: new Date(),
		});

		// Create valid code
		await authCodeRepo.save({
			code: 'valid-code',
			clientId: 'test-client',
			userId: 'test-user',
			redirectUri: 'http://localhost:3000/callback',
			scope: 'openid',
			expiresAt: new Date(Date.now() + 10 * 60 * 1000),
			createdAt: new Date(),
		});

		await authCodeRepo.deleteExpired();

		const expiredCode = await authCodeRepo.findByCode('expired-code');
		const validCode = await authCodeRepo.findByCode('valid-code');

		expect(expiredCode).toBeNull();
		expect(validCode).toBeDefined();
	});
});

describe('RefreshTokenRepository', () => {
	let refreshTokenRepo: RefreshTokenRepository;

	beforeEach(async () => {
		refreshTokenRepo = new RefreshTokenRepository();
		// Clean up test data
		await getDB().collection('refresh_tokens').deleteMany({});
	});

	it('should save and find refresh token', async () => {
		const token = 'test-refresh-token-123';
		await refreshTokenRepo.save({
			token,
			clientId: 'test-client',
			userId: 'test-user',
			scope: 'openid',
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
		});

		const refreshToken = await refreshTokenRepo.findByToken(token);
		expect(refreshToken).toBeDefined();
		expect(refreshToken?.token).toBe(token);
	});

	it('should delete refresh token', async () => {
		const token = 'test-refresh-token-456';
		await refreshTokenRepo.save({
			token,
			clientId: 'test-client',
			userId: 'test-user',
			scope: 'openid',
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
		});

		await refreshTokenRepo.delete(token);
		const refreshToken = await refreshTokenRepo.findByToken(token);
		expect(refreshToken).toBeNull();
	});

	it('should delete all refresh tokens by userId', async () => {
		const userId = 'test-user-123';

		await refreshTokenRepo.save({
			token: 'token-1',
			clientId: 'test-client',
			userId,
			scope: 'openid',
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
		});

		await refreshTokenRepo.save({
			token: 'token-2',
			clientId: 'test-client',
			userId,
			scope: 'openid',
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
		});

		await refreshTokenRepo.deleteByUserId(userId);

		const token1 = await refreshTokenRepo.findByToken('token-1');
		const token2 = await refreshTokenRepo.findByToken('token-2');

		expect(token1).toBeNull();
		expect(token2).toBeNull();
	});
});

describe('AccessTokenRepository', () => {
	let accessTokenRepo: AccessTokenRepository;

	beforeEach(() => {
		accessTokenRepo = new AccessTokenRepository();
	});

	it('should save and find access token (in-memory)', async () => {
		const token = 'test-access-token-123';
		await accessTokenRepo.save({
			token,
			clientId: 'test-client',
			userId: 'test-user',
			scope: 'openid profile',
			expiresAt: new Date(Date.now() + 3600 * 1000),
		});

		const accessToken = await accessTokenRepo.findByToken(token);
		expect(accessToken).toBeDefined();
		expect(accessToken?.token).toBe(token);
	});

	it('should delete access token', async () => {
		const token = 'test-access-token-456';
		await accessTokenRepo.save({
			token,
			clientId: 'test-client',
			userId: 'test-user',
			scope: 'openid',
			expiresAt: new Date(Date.now() + 3600 * 1000),
		});

		await accessTokenRepo.delete(token);
		const accessToken = await accessTokenRepo.findByToken(token);
		expect(accessToken).toBeNull();
	});

	it('should delete expired access tokens', async () => {
		// Create expired token
		await accessTokenRepo.save({
			token: 'expired-token',
			clientId: 'test-client',
			userId: 'test-user',
			scope: 'openid',
			expiresAt: new Date(Date.now() - 1000),
		});

		// Create valid token
		await accessTokenRepo.save({
			token: 'valid-token',
			clientId: 'test-client',
			userId: 'test-user',
			scope: 'openid',
			expiresAt: new Date(Date.now() + 3600 * 1000),
		});

		await accessTokenRepo.deleteExpired();

		const expiredToken = await accessTokenRepo.findByToken('expired-token');
		const validToken = await accessTokenRepo.findByToken('valid-token');

		expect(expiredToken).toBeNull();
		expect(validToken).toBeDefined();
	});
});
