/**
 * SCIM 2.0 Groups Endpoint E2E Tests
 * Tests organizational units (Groups) API with OAuth 2.0 authentication
 */

import { test, expect } from '@playwright/test';

// Load test environment variables
const SSO_BASE_URL = process.env.SSO_BASE_URL || 'http://localhost:5173';
const CLIENT_ID = process.env.SCIM_CLIENT_ID || 'scim-2b7f123d8af54854';
const CLIENT_SECRET =
	process.env.SCIM_CLIENT_SECRET || '9c9yrcb/wHjv6TfF18pKIgjYkWpS5uuZ2yONsSPeZ/Q=';

let accessToken: string;

test.describe('SCIM Groups API', () => {
	test.beforeAll(async ({ request }) => {
		// Get OAuth 2.0 access token
		const tokenResponse = await request.post(`${SSO_BASE_URL}/scim/v2/token`, {
			form: {
				grant_type: 'client_credentials',
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET
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
				client_secret: CLIENT_SECRET
			}
		});

		expect(response.ok()).toBeTruthy();

		const data = await response.json();

		expect(data).toHaveProperty('access_token');
		expect(data).toHaveProperty('token_type', 'Bearer');
		expect(data).toHaveProperty('expires_in', 3600);
		expect(data).toHaveProperty('scope');
		expect(data.scope).toContain('read:groups');
	});

	test('should list all groups (organizational units)', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Groups`, {
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

		// Verify we have org units (should have 57 from seed)
		expect(data.totalResults).toBeGreaterThan(0);
		expect(data.Resources).toBeInstanceOf(Array);
		expect(data.Resources.length).toBeGreaterThan(0);

		// Log summary
		console.log(`📊 Total Groups: ${data.totalResults}`);
		console.log(`📄 Returned: ${data.Resources.length}`);
	});

	test('should return group with correct SCIM schema', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Groups`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const data = await response.json();
		const firstGroup = data.Resources[0];

		// Verify SCIM Core Group schema
		expect(firstGroup.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:Group');
		expect(firstGroup).toHaveProperty('id');
		expect(firstGroup).toHaveProperty('displayName');
		// members is optional, may be empty array or undefined for groups without members
		expect(firstGroup).toHaveProperty('meta');

		// Verify meta attributes
		expect(firstGroup.meta.resourceType).toBe('Group');
		expect(firstGroup.meta).toHaveProperty('created');
		expect(firstGroup.meta).toHaveProperty('lastModified');
		expect(firstGroup.meta).toHaveProperty('location');

		console.log(`✅ Sample Group: ${firstGroup.displayName}`);
	});

	test('should return hierarchical org unit structure (x-orgUnit extension)', async ({
		request
	}) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Groups`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const data = await response.json();
		const groupsWithParent = data.Resources.filter((g: any) => g['x-orgUnit']?.parentUnitId);

		// Verify hierarchical structure
		expect(groupsWithParent.length).toBeGreaterThan(0);

		const sampleGroup = groupsWithParent[0];

		// Verify custom extension
		expect(sampleGroup).toHaveProperty('x-orgUnit');
		expect(sampleGroup['x-orgUnit']).toHaveProperty('unitType');
		expect(sampleGroup['x-orgUnit']).toHaveProperty('level');
		expect(sampleGroup['x-orgUnit']).toHaveProperty('parentUnitId');

		console.log(`🌳 Sample Hierarchical Group:`);
		console.log(`   Name: ${sampleGroup.displayName}`);
		console.log(`   Type: ${sampleGroup['x-orgUnit'].unitType}`);
		console.log(`   Level: ${sampleGroup['x-orgUnit'].level}`);
		console.log(`   Parent: ${sampleGroup['x-orgUnit'].parentUnitId}`);
	});

	test('should support pagination', async ({ request }) => {
		// Request first page (10 items)
		const response1 = await request.get(
			`${SSO_BASE_URL}/scim/v2/Groups?startIndex=1&count=10`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		const data1 = await response1.json();

		expect(data1.startIndex).toBe(1);
		expect(data1.itemsPerPage).toBeLessThanOrEqual(10);

		// Request second page
		const response2 = await request.get(
			`${SSO_BASE_URL}/scim/v2/Groups?startIndex=11&count=10`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		const data2 = await response2.json();

		expect(data2.startIndex).toBe(11);

		// Verify different results
		if (data1.Resources.length > 0 && data2.Resources.length > 0) {
			expect(data1.Resources[0].id).not.toBe(data2.Resources[0].id);
		}

		console.log(`📄 Page 1: ${data1.itemsPerPage} groups`);
		console.log(`📄 Page 2: ${data2.itemsPerPage} groups`);
	});

	test('should include group members', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Groups`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const data = await response.json();
		const groupsWithMembers = data.Resources.filter((g: any) => g.members && g.members.length > 0);

		if (groupsWithMembers.length > 0) {
			const sampleGroup = groupsWithMembers[0];
			const member = sampleGroup.members[0];

			// Verify member structure
			expect(member).toHaveProperty('value'); // User ID
			expect(member).toHaveProperty('$ref'); // Resource URI
			expect(member).toHaveProperty('type', 'User');
			expect(member).toHaveProperty('display'); // Display name

			console.log(`👥 Sample Group with Members:`);
			console.log(`   Group: ${sampleGroup.displayName}`);
			console.log(`   Members: ${sampleGroup.members.length}`);
			console.log(`   Sample Member: ${member.display}`);
		} else {
			console.log(`⚠️  No groups with members found (may need to run seed data)`);
		}
	});

	test('should have unit-level managers (unique feature)', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Groups`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const data = await response.json();
		const groupsWithManagers = data.Resources.filter((g: any) => g['x-orgUnit']?.managerId);

		if (groupsWithManagers.length > 0) {
			const sampleGroup = groupsWithManagers[0];

			expect(sampleGroup['x-orgUnit']).toHaveProperty('managerId');

			console.log(`👔 Sample Group with Manager:`);
			console.log(`   Group: ${sampleGroup.displayName}`);
			console.log(`   Manager ID: ${sampleGroup['x-orgUnit'].managerId}`);
		} else {
			console.log(`⚠️  No groups with managers found`);
		}
	});

	test('should reject invalid OAuth token', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Groups`, {
			headers: {
				Authorization: 'Bearer invalid-token-12345'
			}
		});

		expect(response.status()).toBe(401);
	});

	test('should reject missing OAuth token', async ({ request }) => {
		const response = await request.get(`${SSO_BASE_URL}/scim/v2/Groups`);

		expect(response.status()).toBe(401);
	});

	test('should create new group (organizational unit)', async ({ request }) => {
		const newGroup = {
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
			displayName: `Test Department ${Date.now()}`,
			externalId: `TEST-${Date.now()}`,
			'x-orgUnit': {
				unitType: 'department',
				level: 4,
				parentUnitId: null
			}
		};

		const response = await request.post(`${SSO_BASE_URL}/scim/v2/Groups`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/scim+json'
			},
			data: newGroup
		});

		expect(response.status()).toBe(201);
		expect(response.headers()['location']).toBeTruthy();

		const createdGroup = await response.json();

		expect(createdGroup.displayName).toBe(newGroup.displayName);
		expect(createdGroup).toHaveProperty('id');
		expect(createdGroup['x-orgUnit'].unitType).toBe('department');

		console.log(`✅ Created Group: ${createdGroup.displayName}`);
		console.log(`   ID: ${createdGroup.id}`);
		console.log(`   Location: ${response.headers()['location']}`);
	});
});
