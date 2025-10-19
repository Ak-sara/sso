import { getDB } from './connection';
import type { User, OAuthClient, AuthCode, RefreshToken, Employee, Organization, OrgUnit, Position } from './schemas';
import { ObjectId } from 'mongodb';
import { verify } from '@node-rs/argon2';
import type { PaginationParams, PaginationResult } from '$lib/utils/pagination';
import { getPaginationOffset, createPaginationResult, getMongoSort, buildSearchQuery } from '$lib/utils/pagination';

// ============== Access Token Interface ==============
// We'll store access tokens in memory for performance, but you can move to DB if needed
export interface AccessToken {
	token: string;
	clientId: string;
	userId: string;
	scope: string;
	expiresAt: Date;
}

// In-memory access token storage (optional: move to Redis in production)
const accessTokens = new Map<string, AccessToken>();

// ============== User Repository ==============
export class UserRepository {
	get collection() {
		return getDB().collection<User>('users');
	}

	async create(user: Omit<User, '_id'>): Promise<User> {
		const result = await this.collection.insertOne(user as User);
		return { ...user, _id: result.insertedId } as User;
	}

	async findById(id: string): Promise<User | null> {
		try {
			return await this.collection.findOne({ _id: new ObjectId(id) });
		} catch {
			return null;
		}
	}

	async findByEmail(email: string): Promise<User | null> {
		return await this.collection.findOne({ email });
	}

	async findByUsername(username: string): Promise<User | null> {
		return await this.collection.findOne({ username });
	}

	/**
	 * Find user by email or NIK (employeeId from linked employee)
	 * This allows flexible login with either email or NIK
	 */
	async findByEmailOrNIK(identifier: string): Promise<User | null> {
		// First, try to find by email
		let user = await this.collection.findOne({ email: identifier });
		if (user) return user;

		// If not found, find employee by NIK and get associated user
		const db = getDB();
		const employee = await db.collection('employees').findOne({ employeeId: identifier });

		if (employee && employee.userId) {
			// Get user by userId reference
			user = await this.findById(employee.userId);
			return user;
		}

		return null;
	}

	async verifyPassword(user: User, password: string): Promise<boolean> {
		return await verify(user.password, password);
	}

	async updateLastLogin(userId: string): Promise<void> {
		await this.collection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { lastLogin: new Date() } }
		);
	}

	async updatePassword(userId: string, hashedPassword: string): Promise<void> {
		await this.collection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { password: hashedPassword, updatedAt: new Date() } }
		);
	}

	async list(filter: Partial<User> = {}): Promise<User[]> {
		return await this.collection.find(filter).toArray();
	}

	async listPaginated(params: PaginationParams, filter: any = {}): Promise<PaginationResult<User>> {
		const { page, pageSize, sortKey, sortDirection, search } = params;

		// Build search query
		const searchQuery = search
			? buildSearchQuery(search, ['email', 'username', 'firstName', 'lastName'])
			: {};

		const query = { ...filter, ...searchQuery };
		const sort = getMongoSort(sortKey, sortDirection);
		const skip = getPaginationOffset(page, pageSize);

		const [data, total] = await Promise.all([
			this.collection.find(query).sort(sort).skip(skip).limit(pageSize).toArray(),
			this.collection.countDocuments(query)
		]);

		return createPaginationResult(data, total, params);
	}
}

// ============== OAuth Client Repository ==============
export class OAuthClientRepository {
	private get collection() {
		return getDB().collection<OAuthClient>('oauth_clients');
	}

	async create(client: Omit<OAuthClient, '_id'>): Promise<OAuthClient> {
		const result = await this.collection.insertOne(client as OAuthClient);
		return { ...client, _id: result.insertedId } as OAuthClient;
	}

	async findByClientId(clientId: string): Promise<OAuthClient | null> {
		return await this.collection.findOne({ clientId });
	}

	async verifyClientSecret(client: OAuthClient, secret: string): Promise<boolean> {
		// If client secret is hashed, use verify
		return await verify(client.clientSecret, secret);
	}

	async list(filter: Partial<OAuthClient> = {}): Promise<OAuthClient[]> {
		return await this.collection.find(filter).toArray();
	}

	async update(clientId: string, update: Partial<OAuthClient>): Promise<void> {
		await this.collection.updateOne(
			{ clientId },
			{ $set: { ...update, updatedAt: new Date() } }
		);
	}
}

// ============== Authorization Code Repository ==============
export class AuthCodeRepository {
	private get collection() {
		return getDB().collection<AuthCode>('auth_codes');
	}

	async save(authCode: Omit<AuthCode, '_id'>): Promise<void> {
		await this.collection.insertOne(authCode as AuthCode);
	}

	async findByCode(code: string): Promise<AuthCode | null> {
		return await this.collection.findOne({ code });
	}

	async delete(code: string): Promise<void> {
		await this.collection.deleteOne({ code });
	}

	async deleteExpired(): Promise<void> {
		await this.collection.deleteMany({ expiresAt: { $lt: new Date() } });
	}
}

// ============== Refresh Token Repository ==============
export class RefreshTokenRepository {
	private get collection() {
		return getDB().collection<RefreshToken>('refresh_tokens');
	}

	async save(refreshToken: Omit<RefreshToken, '_id'>): Promise<void> {
		await this.collection.insertOne(refreshToken as RefreshToken);
	}

	async findByToken(token: string): Promise<RefreshToken | null> {
		return await this.collection.findOne({ token });
	}

	async delete(token: string): Promise<void> {
		await this.collection.deleteOne({ token });
	}

	async deleteByUserId(userId: string): Promise<void> {
		await this.collection.deleteMany({ userId });
	}

	async deleteExpired(): Promise<void> {
		await this.collection.deleteMany({ expiresAt: { $lt: new Date() } });
	}
}

// ============== Access Token Repository (In-Memory) ==============
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
		for (const [token, accessToken] of accessTokens.entries()) {
			if (accessToken.expiresAt < now) {
				accessTokens.delete(token);
			}
		}
	}
}

// ============== OAuth Store (Compatible with existing interface) ==============
export class OAuthStore {
	private userRepo = new UserRepository();
	private clientRepo = new OAuthClientRepository();
	private authCodeRepo = new AuthCodeRepository();
	private refreshTokenRepo = new RefreshTokenRepository();
	private accessTokenRepo = new AccessTokenRepository();

	// User methods
	async createUser(user: { id: string; email: string; password: string; name: string; createdAt: Date }): Promise<void> {
		// Map old interface to new schema
		const [firstName, ...lastNameParts] = user.name.split(' ');
		const lastName = lastNameParts.join(' ');

		await this.userRepo.create({
			email: user.email,
			username: user.email.split('@')[0],
			password: user.password,
			firstName: firstName || user.name,
			lastName: lastName || '',
			isActive: true,
			emailVerified: false,
			roles: ['user'],
			createdAt: user.createdAt,
			updatedAt: new Date(),
		});
	}

	async getUserById(id: string): Promise<{ id: string; email: string; password: string; name: string; createdAt: Date } | null> {
		const user = await this.userRepo.findById(id);
		if (!user) return null;

		// Map new schema to old interface
		return {
			id: user._id!.toString(),
			email: user.email,
			password: user.password,
			name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
			createdAt: user.createdAt,
		};
	}

	async getUserByEmail(email: string): Promise<{ id: string; email: string; password: string; name: string; createdAt: Date } | null> {
		const user = await this.userRepo.findByEmail(email);
		if (!user) return null;

		return {
			id: user._id!.toString(),
			email: user.email,
			password: user.password,
			name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
			createdAt: user.createdAt,
		};
	}

	/**
	 * Get user by email or NIK for OAuth authentication
	 */
	async getUserByEmailOrNIK(identifier: string): Promise<{ id: string; email: string; password: string; name: string; createdAt: Date } | null> {
		const user = await this.userRepo.findByEmailOrNIK(identifier);
		if (!user) return null;

		return {
			id: user._id!.toString(),
			email: user.email,
			password: user.password,
			name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
			createdAt: user.createdAt,
		};
	}

	// Client methods
	async createClient(client: { client_id: string; client_secret: string; name: string; redirect_uris: string[]; allowed_scopes: string[]; created_at: Date }): Promise<void> {
		await this.clientRepo.create({
			clientId: client.client_id,
			clientSecret: client.client_secret,
			clientName: client.name,
			redirectUris: client.redirect_uris,
			allowedScopes: client.allowed_scopes,
			grantTypes: ['authorization_code', 'refresh_token'],
			isActive: true,
			createdAt: client.created_at,
			updatedAt: new Date(),
		});
	}

	async getClient(clientId: string): Promise<{ client_id: string; client_secret: string; name: string; redirect_uris: string[]; allowed_scopes: string[]; created_at: Date } | null> {
		const client = await this.clientRepo.findByClientId(clientId);
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

	// Authorization code methods
	async saveAuthCode(authCode: { code: string; client_id: string; user_id: string; redirect_uri: string; scope: string; expires_at: Date; code_challenge?: string; code_challenge_method?: string }): Promise<void> {
		await this.authCodeRepo.save({
			code: authCode.code,
			clientId: authCode.client_id,
			userId: authCode.user_id,
			redirectUri: authCode.redirect_uri,
			scope: authCode.scope,
			codeChallenge: authCode.code_challenge,
			codeChallengeMethod: authCode.code_challenge_method,
			expiresAt: authCode.expires_at,
			createdAt: new Date(),
		});
	}

	async getAuthCode(code: string): Promise<{ code: string; client_id: string; user_id: string; redirect_uri: string; scope: string; expires_at: Date; code_challenge?: string; code_challenge_method?: string } | null> {
		const authCode = await this.authCodeRepo.findByCode(code);
		if (!authCode) return null;

		return {
			code: authCode.code,
			client_id: authCode.clientId,
			user_id: authCode.userId,
			redirect_uri: authCode.redirectUri,
			scope: authCode.scope,
			expires_at: authCode.expiresAt,
			code_challenge: authCode.codeChallenge,
			code_challenge_method: authCode.codeChallengeMethod,
		};
	}

	async deleteAuthCode(code: string): Promise<void> {
		await this.authCodeRepo.delete(code);
	}

	// Access token methods (in-memory)
	async saveAccessToken(token: { token: string; client_id: string; user_id: string; scope: string; expires_at: Date }): Promise<void> {
		await this.accessTokenRepo.save({
			token: token.token,
			clientId: token.client_id,
			userId: token.user_id,
			scope: token.scope,
			expiresAt: token.expires_at,
		});
	}

	async getAccessToken(token: string): Promise<{ token: string; client_id: string; user_id: string; scope: string; expires_at: Date } | null> {
		const accessToken = await this.accessTokenRepo.findByToken(token);
		if (!accessToken) return null;

		return {
			token: accessToken.token,
			client_id: accessToken.clientId,
			user_id: accessToken.userId,
			scope: accessToken.scope,
			expires_at: accessToken.expiresAt,
		};
	}

	// Refresh token methods
	async saveRefreshToken(token: { token: string; client_id: string; user_id: string; expires_at: Date }): Promise<void> {
		await this.refreshTokenRepo.save({
			token: token.token,
			clientId: token.client_id,
			userId: token.user_id,
			scope: 'openid',
			expiresAt: token.expires_at,
			createdAt: new Date(),
		});
	}

	async getRefreshToken(token: string): Promise<{ token: string; client_id: string; user_id: string; expires_at: Date } | null> {
		const refreshToken = await this.refreshTokenRepo.findByToken(token);
		if (!refreshToken) return null;

		return {
			token: refreshToken.token,
			client_id: refreshToken.clientId,
			user_id: refreshToken.userId,
			expires_at: refreshToken.expiresAt,
		};
	}

	async deleteRefreshToken(token: string): Promise<void> {
		await this.refreshTokenRepo.delete(token);
	}

	// Cleanup expired tokens
	async cleanupExpiredTokens(): Promise<void> {
		await Promise.all([
			this.authCodeRepo.deleteExpired(),
			this.accessTokenRepo.deleteExpired(),
			this.refreshTokenRepo.deleteExpired(),
		]);
	}
}

// ============== Employee Repository ==============
export class EmployeeRepository {
	get collection() {
		return getDB().collection<Employee>('employees');
	}

	async findById(id: string): Promise<Employee | null> {
		try {
			return await this.collection.findOne({ _id: new ObjectId(id) });
		} catch {
			return null;
		}
	}

	async findByEmployeeId(employeeId: string): Promise<Employee | null> {
		return await this.collection.findOne({ employeeId });
	}

	async findByUserId(userId: string): Promise<Employee | null> {
		return await this.collection.findOne({ userId });
	}

	async list(filter: any = {}): Promise<Employee[]> {
		return await this.collection.find(filter).toArray();
	}

	async listPaginated(params: PaginationParams, filter: any = {}): Promise<PaginationResult<Employee>> {
		const { page, pageSize, sortKey, sortDirection, search } = params;

		// Build search query
		const searchQuery = search
			? buildSearchQuery(search, ['employeeId', 'firstName', 'lastName', 'fullName', 'email'])
			: {};

		const query = { ...filter, ...searchQuery };
		const sort = getMongoSort(sortKey || 'createdAt', sortDirection);
		const skip = getPaginationOffset(page, pageSize);

		const [data, total] = await Promise.all([
			this.collection.find(query).sort(sort).skip(skip).limit(pageSize).toArray(),
			this.collection.countDocuments(query)
		]);

		return createPaginationResult(data, total, params);
	}

	async update(id: string, update: Partial<Employee>): Promise<Employee | null> {
		const result = await this.collection.findOneAndUpdate(
			{ _id: new ObjectId(id) },
			{ $set: { ...update, updatedAt: new Date() } },
			{ returnDocument: 'after' }
		);
		return result || null;
	}

	async create(employee: Omit<Employee, '_id'>): Promise<Employee> {
		const result = await this.collection.insertOne(employee as Employee);
		return { ...employee, _id: result.insertedId } as Employee;
	}

	async delete(id: string): Promise<void> {
		await this.collection.deleteOne({ _id: new ObjectId(id) });
	}

	async getAll(): Promise<Employee[]> {
		return await this.collection.find({}).toArray();
	}

	async findByUnit(unitId: string): Promise<Employee[]> {
		try {
			return await this.collection.find({
				'assignment.unitId': new ObjectId(unitId)
			}).toArray();
		} catch {
			return [];
		}
	}
}

// ============== Organization Repository ==============
export class OrganizationRepository {
	get collection() {
		return getDB().collection<Organization>('organizations');
	}

	async findById(id: string): Promise<Organization | null> {
		try {
			return await this.collection.findOne({ _id: new ObjectId(id) });
		} catch {
			return null;
		}
	}

	async findByCode(code: string): Promise<Organization | null> {
		return await this.collection.findOne({ code });
	}

	async list(filter: any = {}): Promise<Organization[]> {
		return await this.collection.find(filter).toArray();
	}
}

// ============== OrgUnit Repository ==============
export class OrgUnitRepository {
	get collection() {
		return getDB().collection<OrgUnit>('org_units');
	}

	async findById(id: string): Promise<OrgUnit | null> {
		try {
			return await this.collection.findOne({ _id: new ObjectId(id) });
		} catch {
			return null;
		}
	}

	async findByCode(code: string, organizationId: string): Promise<OrgUnit | null> {
		return await this.collection.findOne({ code, organizationId });
	}

	async list(filter: any = {}): Promise<OrgUnit[]> {
		return await this.collection.find(filter).toArray();
	}

	async getAll(): Promise<OrgUnit[]> {
		return await this.collection.find({}).toArray();
	}

	async create(orgUnit: Omit<OrgUnit, '_id'>): Promise<OrgUnit> {
		const result = await this.collection.insertOne(orgUnit as OrgUnit);
		return { ...orgUnit, _id: result.insertedId } as OrgUnit;
	}

	async update(id: string, update: Partial<OrgUnit>): Promise<OrgUnit | null> {
		const result = await this.collection.findOneAndUpdate(
			{ _id: new ObjectId(id) },
			{ $set: { ...update, updatedAt: new Date() } },
			{ returnDocument: 'after' }
		);
		return result || null;
	}
}

// ============== Position Repository ==============
export class PositionRepository {
	get collection() {
		return getDB().collection<Position>('positions');
	}

	async findById(id: string): Promise<Position | null> {
		try {
			return await this.collection.findOne({ _id: new ObjectId(id) });
		} catch {
			return null;
		}
	}

	async findByCode(code: string, organizationId: string): Promise<Position | null> {
		return await this.collection.findOne({ code, organizationId });
	}

	async list(filter: any = {}): Promise<Position[]> {
		return await this.collection.find(filter).toArray();
	}
}

// Export singleton instance
export const oauthStore = new OAuthStore();

// Export repositories for direct access
export const userRepository = new UserRepository();
export const employeeRepository = new EmployeeRepository();
export const organizationRepository = new OrganizationRepository();
export const orgUnitRepository = new OrgUnitRepository();
export const positionRepository = new PositionRepository();
export const oauthClientRepository = new OAuthClientRepository();
export const authCodeRepository = new AuthCodeRepository();
export const refreshTokenRepository = new RefreshTokenRepository();
export const accessTokenRepository = new AccessTokenRepository();
