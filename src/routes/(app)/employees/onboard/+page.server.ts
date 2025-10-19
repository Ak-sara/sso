import type { Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { identityRepository } from '$lib/db/identity-repository';

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

		// Check if employeeId (NIK) already exists
		const existingEmployee = await identityRepository.findByEmployeeId(data.employeeId);
		if (existingEmployee) {
			return fail(400, { error: `NIK ${data.employeeId} sudah digunakan` });
		}

		// Check if email already exists (if provided)
		if (data.email) {
			const existingEmail = await identityRepository.findByEmail(data.email);
			if (existingEmail) {
				return fail(400, { error: `Email ${data.email} sudah digunakan` });
			}
		}

		try {
			// Hash password
			const passwordHash = await hash(data.password || `temp${data.employeeId}`, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			// Create unified identity (employee with SSO access)
			// Note: All employees now have identities by default, but can be inactive
			const identity = await identityRepository.create({
				identityType: 'employee',
				username: data.username || data.email || data.employeeId, // Email or NIK as username
				email: data.email || undefined,
				password: passwordHash,
				isActive: data.createSSOAccount, // Only active if SSO explicitly requested
				emailVerified: false,
				roles: data.roles,

				// Personal Info
				firstName: data.firstName,
				lastName: data.lastName,
				fullName: `${data.firstName} ${data.lastName}`,
				phone: data.phone || undefined,
				gender: data.gender as any,
				dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,

				// Employee-specific fields
				employeeId: data.employeeId,
				organizationId: data.organizationId,
				orgUnitId: data.orgUnitId || undefined,
				positionId: data.positionId || undefined,
				employmentType: data.employmentType as any,
				employmentStatus: 'active',
				joinDate: new Date(data.joinDate),
				probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : undefined,
				workLocation: data.workLocation || undefined,
				region: data.region || undefined,
				isRemote: false,
				secondaryAssignments: [],
				customProperties: data.customProperties,

				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system' // TODO: Get from session
			});

			// Log audit trail
			await db.collection('audit_log').insertOne({
				timestamp: new Date(),
				action: 'employee.onboarding',
				resourceType: 'identity',
				resourceId: identity._id?.toString(),
				identityId: identity._id?.toString(), // Updated field name
				details: {
					employeeId: data.employeeId,
					fullName: `${data.firstName} ${data.lastName}`,
					ssoAccountCreated: data.createSSOAccount,
					username: identity.username,
					isActive: identity.isActive
				},
				ipAddress: null,
				userAgent: null
			});

			// Create assignment history entry
			await db.collection('employee_history').insertOne({
				identityId: identity._id,
				employeeId: data.employeeId,
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

			// Redirect to identity detail page
			throw redirect(303, `/identities/${identity._id}`);

		} catch (error) {
			console.error('Onboarding error:', error);
			if (error instanceof Response) throw error; // Re-throw redirect
			return fail(500, { error: 'Gagal melakukan onboarding karyawan' });
		}
	}
} satisfies Actions;
