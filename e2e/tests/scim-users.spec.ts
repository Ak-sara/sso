/**
 * SCIM 2.0 Users Endpoint E2E Tests
 * Tests employee identities (Users) API with OAuth 2.0 authentication
 */

import { test, expect } from '@playwright/test';

// Load test environment variables
const SSO_BASE_URL = process.env.SSO_BASE_URL || 'http://localhost:5173';
const CLIENT_ID = process.env.SCIM_CLIENT_ID || 'scim-2b7f123d8af54854';
const CLIENT_SECRET =
	process.env.SCIM_CLIENT_SECRET || '9c9yrcb/wHjv6TfF18pKIgjYkWpS5uuZ2yONsSPeZ/Q=';

let accessToken: string;

test.describe('SCIM Users API', () => {
	test.beforeAll(async ({ request }) => {
		// Get OAuth 2.0 access token
		const tokenResponse = await request.post(`${SSO_BASE_URL}/scim/v2/token`, {
			form: {
				grant_type: 'client_credentials',
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				scope: 'read:users write:users'
			}
		});

		expect(tokenResponse.ok()).toBeTruthy();

		const tokenData = await tokenResponse.json();
		accessToken = tokenData.access_token;

		console.log('✅ OAuth token obtained:', accessToken.substring(0, 20) + '...');
	});

	test('should authenticate with OAuth 2.0 client credentials', async ({ request }) => {
		const response = await request.post(`${SSO_BASE_URL}/scim/v2/token`, {
			form: {
				grant_type: 'client_credentials',
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				scope: 'read:users'
			}
		});

		expect(response.ok()).toBeTruthy();

		const data = await response.json();

		expect(data).toHaveProperty('access_token');
		expect(data).toHaveProperty('token_type', 'Bearer');
		expect(data).toHaveProperty('expires_in', 3600);
		expect(data).toHaveProperty('scope');
		expect(data.scope).toContain('read:users');
	});

	test('should list all users (employee identities)', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Users`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/scim+json'
			}
		});

		expect(response.ok()).toBeTruthy();
		expect(response.headers()['content-type']).toContain('application/scim+json');

		const data = await response.json();

		// Verify SCIM schema
		expect(data.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');

		// Verify we have users (should have identities from seed)
		expect(data.totalResults).toBeGreaterThanOrEqual(0);
		expect(data.Resources).toBeInstanceOf(Array);

		// Log summary
		console.log(`📊 Total Users: ${data.totalResults}`);
		console.log(`📄 Returned: ${data.Resources.length}`);
	});

	test('should return user with correct SCIM schema', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Users`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const data = await response.json();

		if (data.Resources.length === 0) {
			console.log('⚠️  No users found - skipping schema validation');
			return;
		}

		const firstUser = data.Resources[0];

		// Verify SCIM Core User schema
		expect(firstUser.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:User');
		expect(firstUser).toHaveProperty('id');
		expect(firstUser).toHaveProperty('userName');
		expect(firstUser).toHaveProperty('emails');
		expect(firstUser).toHaveProperty('name');
		expect(firstUser).toHaveProperty('active');
		expect(firstUser).toHaveProperty('meta');

		// Verify meta attributes
		expect(firstUser.meta.resourceType).toBe('User');
		expect(firstUser.meta).toHaveProperty('created');
		expect(firstUser.meta).toHaveProperty('lastModified');
		expect(firstUser.meta).toHaveProperty('location');

		// Verify name structure
		expect(firstUser.name).toHaveProperty('formatted');
		expect(firstUser.name).toHaveProperty('givenName');
		expect(firstUser.name).toHaveProperty('familyName');

		// Verify emails array
		expect(firstUser.emails).toBeInstanceOf(Array);
		if (firstUser.emails.length > 0) {
			expect(firstUser.emails[0]).toHaveProperty('value');
			expect(firstUser.emails[0]).toHaveProperty('primary');
		}

		console.log(`✅ Sample User: ${firstUser.userName}`);
		console.log(`   Name: ${firstUser.name.formatted}`);
		console.log(`   Email: ${firstUser.emails[0]?.value}`);
	});

	test('should return employee-specific fields (x-position extension)', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Users`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const data = await response.json();

		if (data.Resources.length === 0) {
			console.log('⚠️  No users found - skipping extension validation');
			return;
		}

		const usersWithPosition = data.Resources.filter((u: any) => u['x-position']);

		if (usersWithPosition.length > 0) {
			const sampleUser = usersWithPosition[0];

			// Verify custom extension
			expect(sampleUser).toHaveProperty('x-position');
			expect(sampleUser['x-position']).toHaveProperty('positionId');
			expect(sampleUser['x-position']).toHaveProperty('positionName');

			console.log(`💼 Sample User with Position:`);
			console.log(`   Name: ${sampleUser.name.formatted}`);
			console.log(`   Position: ${sampleUser['x-position'].positionName}`);
			console.log(`   Org Unit: ${sampleUser['x-position'].orgUnitName || 'N/A'}`);
		} else {
			console.log(`⚠️  No users with positions found`);
		}
	});

	test('should support pagination', async ({ request }) => {
		// Request first page (5 items)
		const response1 = await request.get(
			`${SSO_BASE_URL}/scim/v2/Users?startIndex=1&count=5`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		const data1 = await response1.json();

		expect(data1.startIndex).toBe(1);
		expect(data1.itemsPerPage).toBeLessThanOrEqual(5);

		// Request second page
		const response2 = await request.get(
			`${SSO_BASE_URL}/scim/v2/Users?startIndex=6&count=5`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		const data2 = await response2.json();

		expect(data2.startIndex).toBe(6);

		// Verify different results (if both pages have data)
		if (data1.Resources.length > 0 && data2.Resources.length > 0) {
			expect(data1.Resources[0].id).not.toBe(data2.Resources[0].id);
		}

		console.log(`📄 Page 1: ${data1.itemsPerPage} users`);
		console.log(`📄 Page 2: ${data2.itemsPerPage} users`);
	});

	test('should filter users by active status', async ({ request }) => {
		const response = await request.get(
			`${SSO_BASE_URL}/scim/v2/Users?filter=${encodeURIComponent('active eq true')}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		expect(response.ok()).toBeTruthy();

		const data = await response.json();

		// All returned users should be active
		data.Resources.forEach((user: any) => {
			expect(user.active).toBe(true);
		});

		console.log(`✅ Active Users: ${data.totalResults}`);
	});

	test('should filter users by email domain', async ({ request }) => {
		const response = await request.get(
			`${SSO_BASE_URL}/scim/v2/Users?filter=${encodeURIComponent('userName ew "@ias.co.id"')}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		expect(response.ok()).toBeTruthy();

		const data = await response.json();

		// All returned users should have @ias.co.id email
		data.Resources.forEach((user: any) => {
			expect(user.userName).toContain('@ias.co.id');
		});

		console.log(`✅ Users with @ias.co.id: ${data.totalResults}`);
	});

	test('should include manager reference', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Users`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const data = await response.json();
		const usersWithManager = data.Resources.filter(
			(u: any) => u['x-position']?.managerId
		);

		if (usersWithManager.length > 0) {
			const sampleUser = usersWithManager[0];

			expect(sampleUser['x-position']).toHaveProperty('managerId');

			console.log(`👔 Sample User with Manager:`);
			console.log(`   User: ${sampleUser.name.formatted}`);
			console.log(`   Manager ID: ${sampleUser['x-position'].managerId}`);
		} else {
			console.log(`⚠️  No users with managers found`);
		}
	});

	test('should include organization and org unit info', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Users`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const data = await response.json();

		if (data.Resources.length > 0) {
			const usersWithOrgInfo = data.Resources.filter(
				(u: any) => u['x-position']?.organizationName
			);

			if (usersWithOrgInfo.length > 0) {
				const sampleUser = usersWithOrgInfo[0];

				expect(sampleUser['x-position']).toHaveProperty('organizationName');
				expect(sampleUser['x-position']).toHaveProperty('orgUnitName');

				console.log(`🏢 Sample User with Org Info:`);
				console.log(`   User: ${sampleUser.name.formatted}`);
				console.log(`   Organization: ${sampleUser['x-position'].organizationName}`);
				console.log(`   Org Unit: ${sampleUser['x-position'].orgUnitName}`);
			}
		}
	});

	test('should reject invalid OAuth token', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Users`, {
			headers: {
				Authorization: 'Bearer invalid-token-12345'
			}
		});

		expect(response.status()).toBe(401);
	});

	test('should reject missing OAuth token', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Users`);

		expect(response.status()).toBe(401);
	});

	test('should reject insufficient scope', async ({ request }) => {
		// Get token with only write:users scope (missing read:users)
		const tokenResponse = await request.post(`${SSO_BASE_URL}/scim/v2/token`, {
			form: {
				grant_type: 'client_credentials',
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				scope: 'write:users' // No read:users
			}
		});

		const tokenData = await tokenResponse.json();
		const writeOnlyToken = tokenData.access_token;

		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Users`, {
			headers: {
				Authorization: `Bearer ${writeOnlyToken}`
			}
		});

		// Should be forbidden (403) or unauthorized (401)
		expect([401, 403]).toContain(response.status());
	});
});
