import type { Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';

export const actions = {
	default: async ({ request }) => {
		const db = getDB();
		const formData = await request.formData();

		// Parse form data
		const data = {
			// Personal Info
			firstName: formData.get('firstName') as string,
			lastName: formData.get('lastName') as string,
			email: formData.get('email') as string,
			phone: formData.get('phone') as string,
			gender: formData.get('gender') as string,
			dateOfBirth: formData.get('dateOfBirth') as string,

			// Employment Info
			employeeId: formData.get('employeeId') as string,
			employmentType: formData.get('employmentType') as string,
			joinDate: formData.get('joinDate') as string,
			probationEndDate: formData.get('probationEndDate') as string,

			// Assignment
			organizationId: formData.get('organizationId') as string,
			orgUnitId: formData.get('orgUnitId') as string,
			positionId: formData.get('positionId') as string,
			workLocation: formData.get('workLocation') as string,
			region: formData.get('region') as string,

			// SSO Access
			createSSOAccount: formData.get('createSSOAccount') === 'true',
			username: formData.get('username') as string,
			password: formData.get('password') as string,
			roles: JSON.parse(formData.get('roles') as string || '["user"]'),

			// Custom Properties
			customProperties: JSON.parse(formData.get('customProperties') as string || '{}')
		};

		// Validation
		if (!data.firstName || !data.lastName || !data.employeeId || !data.employmentType || !data.joinDate) {
			return fail(400, { error: 'Field yang wajib diisi belum lengkap', data });
		}

		// Check if employeeId already exists
		const existingEmployee = await db.collection('employees').findOne({ employeeId: data.employeeId });
		if (existingEmployee) {
			return fail(400, { error: `NIK ${data.employeeId} sudah digunakan` });
		}

		// Check if email already exists
		const existingEmail = await db.collection('employees').findOne({ email: data.email });
		if (existingEmail) {
			return fail(400, { error: `Email ${data.email} sudah digunakan` });
		}

		try {
			let userId: ObjectId | null = null;

			// Create SSO account if requested
			if (data.createSSOAccount) {
				if (!data.username || !data.password) {
					return fail(400, { error: 'Username dan password harus diisi untuk membuat akun SSO' });
				}

				// Check if username already exists
				const existingUser = await db.collection('users').findOne({ username: data.username });
				if (existingUser) {
					return fail(400, { error: `Username ${data.username} sudah digunakan` });
				}

				// Hash password
				const passwordHash = await hash(data.password, {
					memoryCost: 19456,
					timeCost: 2,
					outputLen: 32,
					parallelism: 1
				});

				// Create SSO user
				const userResult = await db.collection('users').insertOne({
					username: data.username,
					email: data.email,
					passwordHash,
					roles: data.roles,
					firstName: data.firstName,
					lastName: data.lastName,
					enabled: true,
					emailVerified: false,
					requirePasswordChange: true, // Force password change on first login
					createdAt: new Date(),
					updatedAt: new Date()
				});

				userId = userResult.insertedId;
			}

			// Create employee record
			const employeeResult = await db.collection('employees').insertOne({
				employeeId: data.employeeId,
				firstName: data.firstName,
				lastName: data.lastName,
				fullName: `${data.firstName} ${data.lastName}`,
				email: data.email,
				phone: data.phone || null,
				gender: data.gender || null,
				dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,

				// Employment
				employmentType: data.employmentType,
				employmentStatus: 'active',
				joinDate: new Date(data.joinDate),
				probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null,
				contractEndDate: null,
				terminationDate: null,
				terminationReason: null,

				// Assignment
				organizationId: data.organizationId ? new ObjectId(data.organizationId) : null,
				orgUnitId: data.orgUnitId ? new ObjectId(data.orgUnitId) : null,
				positionId: data.positionId ? new ObjectId(data.positionId) : null,
				workLocation: data.workLocation || null,
				region: data.region || null,
				secondaryAssignments: [],

				// SSO Link
				userId: userId,

				// Custom Properties
				customProperties: data.customProperties,

				// Metadata
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system', // TODO: Get from session
				updatedBy: 'system'
			});

			// Log audit trail
			await db.collection('audit_log').insertOne({
				timestamp: new Date(),
				action: 'employee.onboarding',
				resourceType: 'employee',
				resourceId: employeeResult.insertedId.toString(),
				userId: 'system', // TODO: Get from session
				details: {
					employeeId: data.employeeId,
					fullName: `${data.firstName} ${data.lastName}`,
					ssoAccountCreated: data.createSSOAccount,
					username: data.username || null
				},
				ipAddress: null,
				userAgent: null
			});

			// Create assignment history entry
			await db.collection('employee_history').insertOne({
				employeeId: employeeResult.insertedId,
				eventType: 'onboarding',
				eventDate: new Date(data.joinDate),
				organizationId: data.organizationId ? new ObjectId(data.organizationId) : null,
				orgUnitId: data.orgUnitId ? new ObjectId(data.orgUnitId) : null,
				positionId: data.positionId ? new ObjectId(data.positionId) : null,
				details: {
					employmentType: data.employmentType,
					workLocation: data.workLocation,
					region: data.region
				},
				createdAt: new Date(),
				createdBy: 'system'
			});

			// TODO: Send welcome email to employee
			// TODO: Notify HR team
			// TODO: Trigger SCIM provisioning to connected apps

			// Redirect to employee detail page
			throw redirect(303, `/employees/${employeeResult.insertedId}`);

		} catch (error) {
			console.error('Onboarding error:', error);
			if (error instanceof Response) throw error; // Re-throw redirect
			return fail(500, { error: 'Gagal melakukan onboarding karyawan' });
		}
	}
} satisfies Actions;
