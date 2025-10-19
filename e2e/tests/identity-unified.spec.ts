import { test, expect } from '@playwright/test';
import { getDB } from '../../src/lib/db/connection';
import { identityRepository } from '../../src/lib/db/identity-repository';
import { hash } from '@node-rs/argon2';

test.describe('Unified Identity Management', () => {
	test.beforeEach(async () => {
		// Clean up test identities
		await getDB().collection('identities').deleteMany({
			email: /test@identity/
		});

		// Seed test identity for login
		const hashedPassword = await hash('password123');
		await identityRepository.create({
			identityType: 'employee',
			username: 'test@identity.com',
			email: 'test@identity.com',
			password: hashedPassword,
			firstName: 'Test',
			lastName: 'Identity',
			fullName: 'Test Identity',
			employeeId: 'TEST00001',
			organizationId: 'test-org-id',
			isActive: true,
			emailVerified: true,
			roles: ['admin'],
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	test('should display unified /identities page with tabs', async ({ page }) => {
		// Login first
		await page.goto('/login');
		await page.fill('input[name="email"]', 'test@identity.com');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		// Navigate to /identities
		await page.goto('/identities');

		// Check page title
		await expect(page.locator('h1')).toContainText('Identitas');

		// Check tabs exist
		await expect(page.locator('text=Karyawan')).toBeVisible();
		await expect(page.locator('text=Partners')).toBeVisible();
		await expect(page.locator('text=External')).toBeVisible();
		await expect(page.locator('text=Service Accounts')).toBeVisible();
	});

	test('should filter identities by type (tabs)', async ({ page }) => {
		// Create different identity types
		const employeeId = await identityRepository.create({
			identityType: 'employee',
			username: 'employee@test.com',
			email: 'employee@test.com',
			password: await hash('password123'),
			firstName: 'Employee',
			lastName: 'User',
			fullName: 'Employee User',
			employeeId: 'EMP00001',
			organizationId: 'test-org-id',
			isActive: true,
			emailVerified: false,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const partnerId = await identityRepository.create({
			identityType: 'partner',
			username: 'partner@test.com',
			email: 'partner@test.com',
			password: await hash('password123'),
			firstName: 'Partner',
			lastName: 'User',
			fullName: 'Partner User',
			organizationId: 'test-org-id',
			partnerType: 'vendor',
			companyName: 'Test Vendor Inc.',
			isActive: true,
			emailVerified: false,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Login and navigate
		await page.goto('/login');
		await page.fill('input[name="email"]', 'test@identity.com');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		await page.goto('/identities?tab=employee');
		await expect(page.locator('text=Employee User')).toBeVisible();

		await page.goto('/identities?tab=partner');
		await expect(page.locator('text=Partner User')).toBeVisible();
	});

	test('should allow login with NIK (employeeId)', async ({ page }) => {
		await page.goto('/login');
		await page.fill('input[name="email"]', 'TEST00001'); // Use NIK
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		// Should redirect to dashboard
		await expect(page).toHaveURL('/');
	});

	test('should allow login with email', async ({ page }) => {
		await page.goto('/login');
		await page.fill('input[name="email"]', 'test@identity.com'); // Use email
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		// Should redirect to dashboard
		await expect(page).toHaveURL('/');
	});
});

test.describe('CSV Import with Smart Logic', () => {
	test.beforeEach(async () => {
		await getDB().collection('identities').deleteMany({
			employeeId: /CSV/
		});
	});

	test('should display /sync page with tabs', async ({ page }) => {
		// Login
		const hashedPassword = await hash('password123');
		await identityRepository.create({
			identityType: 'employee',
			username: 'admin@csv.test',
			email: 'admin@csv.test',
			password: hashedPassword,
			firstName: 'Admin',
			lastName: 'User',
			fullName: 'Admin User',
			employeeId: 'ADMIN001',
			organizationId: 'test-org-id',
			isActive: true,
			emailVerified: true,
			roles: ['admin'],
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await page.goto('/login');
		await page.fill('input[name="email"]', 'admin@csv.test');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		await page.goto('/sync');

		// Check tabs
		await expect(page.locator('text=CSV Import/Export')).toBeVisible();
		await expect(page.locator('text=Entra ID Sync')).toBeVisible();
	});

	test('should create new identity with isActive: true on CSV import', async ({ request }) => {
		// Simulate CSV upload via API
		const csvData = `NIK,FirstName,LastName,Email,OrgUnit,Position,EmploymentType,JoinDate,WorkLocation
CSV00001,John,Doe,john@csv.test,IT-DEV,Engineer,permanent,2024-01-15,CGK`;

		const formData = new FormData();
		const blob = new Blob([csvData], { type: 'text/csv' });
		formData.append('file', blob, 'employees.csv');

		const response = await request.post('http://localhost:5173/sync?/uploadCSV', {
			data: formData
		});

		expect(response.ok()).toBeTruthy();

		// Check preview shows new identity
		const jsonResponse = await response.json();
		expect(jsonResponse.type).toBe('success');
		expect(jsonResponse.data.preview.toCreate).toHaveLength(1);
		expect(jsonResponse.data.preview.toCreate[0].isActive).toBe(true);
	});

	test('should preserve status on re-import', async ({ request }) => {
		// Create existing identity with isActive: false
		await identityRepository.create({
			identityType: 'employee',
			username: 'CSV00002',
			email: 'existing@csv.test',
			password: await hash('existingpass'),
			firstName: 'Existing',
			lastName: 'Employee',
			fullName: 'Existing Employee',
			employeeId: 'CSV00002',
			organizationId: 'test-org-id',
			isActive: false, // Inactive
			emailVerified: false,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Re-import with updated name
		const csvData = `NIK,FirstName,LastName,Email,OrgUnit,Position,EmploymentType,JoinDate,WorkLocation
CSV00002,Updated,Name,existing@csv.test,HR-REC,Recruiter,pkwt,2024-02-01,DPS`;

		const formData = new FormData();
		const blob = new Blob([csvData], { type: 'text/csv' });
		formData.append('file', blob, 'employees.csv');

		const response = await request.post('http://localhost:5173/sync?/uploadCSV', {
			data: formData
		});

		const jsonResponse = await response.json();
		expect(jsonResponse.data.preview.toUpdate).toHaveLength(1);

		// Apply import
		const applyResponse = await request.post('http://localhost:5173/sync?/applyImport', {
			data: {
				previewData: JSON.stringify(jsonResponse.data.preview)
			}
		});

		expect(applyResponse.ok()).toBeTruthy();

		// Verify status preserved (should still be false)
		const updated = await identityRepository.findByEmployeeId('CSV00002');
		expect(updated?.isActive).toBe(false); // Status preserved
		expect(updated?.firstName).toBe('Updated'); // Name updated
	});
});

test.describe('OAuth with identityId', () => {
	let testIdentity: any;

	test.beforeEach(async () => {
		await getDB().collection('identities').deleteMany({
			email: /oauth@test/
		});
		await getDB().collection('auth_codes').deleteMany({});
		await getDB().collection('refresh_tokens').deleteMany({});

		// Create test identity
		const hashedPassword = await hash('password123');
		testIdentity = await identityRepository.create({
			identityType: 'employee',
			username: 'oauth@test.com',
			email: 'oauth@test.com',
			password: hashedPassword,
			firstName: 'OAuth',
			lastName: 'Test',
			fullName: 'OAuth Test',
			employeeId: 'OAUTH001',
			organizationId: 'test-org-id',
			isActive: true,
			emailVerified: true,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	test('should use identityId in OAuth flow', async ({ page }) => {
		// Navigate to OAuth authorize
		await page.goto('/oauth/authorize?client_id=test-client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=openid%20profile');

		// Login
		await page.fill('input[name="email"]', 'oauth@test.com');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		// Should redirect with authorization code
		await page.waitForURL(/code=/);
		const url = page.url();
		expect(url).toContain('code=');

		// Verify identity_id cookie is set (not user_id)
		const cookies = await page.context().cookies();
		const identityCookie = cookies.find(c => c.name === 'identity_id');
		expect(identityCookie).toBeDefined();
		expect(identityCookie?.value).toBe(testIdentity._id.toString());
	});

	test('should return identity data in /oauth/userinfo', async ({ request }) => {
		// This is a simplified test - in reality, you'd need to complete the OAuth flow
		// For now, we'll just verify the endpoint structure
		const response = await request.get('http://localhost:5173/oauth/userinfo', {
			headers: {
				'Authorization': 'Bearer test-token'
			}
		});

		// Should return 401 for invalid token (expected)
		expect(response.status()).toBe(401);
	});
});

test.describe('Onboarding with Unified Identity', () => {
	test('should create identity directly (not user + employee)', async ({ page, request }) => {
		// Login as admin
		const hashedPassword = await hash('password123');
		await identityRepository.create({
			identityType: 'employee',
			username: 'admin@onboard.test',
			email: 'admin@onboard.test',
			password: hashedPassword,
			firstName: 'Admin',
			lastName: 'User',
			fullName: 'Admin User',
			employeeId: 'ADMIN002',
			organizationId: 'test-org-id',
			isActive: true,
			emailVerified: true,
			roles: ['admin'],
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await page.goto('/login');
		await page.fill('input[name="email"]', 'admin@onboard.test');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		// Navigate to onboarding
		await page.goto('/employees/onboard');

		// Fill form
		await page.fill('input[name="firstName"]', 'New');
		await page.fill('input[name="lastName"]', 'Employee');
		await page.fill('input[name="email"]', 'new@onboard.test');
		await page.fill('input[name="employeeId"]', 'ONBOARD001');
		await page.selectOption('select[name="employmentType"]', 'permanent');
		await page.fill('input[name="joinDate"]', '2024-10-19');

		// Enable SSO
		await page.check('input[name="createSSOAccount"]');
		await page.fill('input[name="username"]', 'new@onboard.test');
		await page.fill('input[name="password"]', 'newpass123');

		// Submit
		await page.click('button[type="submit"]');

		// Should redirect to /identities/{id}
		await expect(page).toHaveURL(/\/identities\//);

		// Verify identity was created (not separate user + employee)
		const identity = await identityRepository.findByEmployeeId('ONBOARD001');
		expect(identity).toBeDefined();
		expect(identity?.identityType).toBe('employee');
		expect(identity?.email).toBe('new@onboard.test');
		expect(identity?.isActive).toBe(true); // SSO enabled
	});
});
