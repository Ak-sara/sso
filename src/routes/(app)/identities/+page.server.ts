import { identityRepository } from '$lib/db/identity-repository';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';

export const load: PageServerLoad = async () => {
	// Fetch ALL identities - filtering will be done client-side
	const allIdentities = await identityRepository.findAll();

	// Safety check
	if (!allIdentities || allIdentities.length === 0) {
		return {
			identities: []
		};
	}

	// Helper to convert date to ISO string (handles both Date objects and strings)
	const toISOStringSafe = (date: any): string | undefined => {
		if (!date) return undefined;
		if (typeof date === 'string') return date;
		if (date instanceof Date) return date.toISOString();
		try {
			return new Date(date).toISOString();
		} catch {
			return undefined;
		}
	};

	// Helper to convert ObjectId to string
	const toStringSafe = (value: any): string | undefined => {
		if (!value) return undefined;
		if (typeof value === 'string') return value;
		return value.toString();
	};

	return {
		identities: allIdentities.map(identity => ({
			...identity,
			_id: identity._id?.toString() || '',
			organizationId: toStringSafe(identity.organizationId),
			orgUnitId: toStringSafe(identity.orgUnitId),
			positionId: toStringSafe(identity.positionId),
			managerId: toStringSafe(identity.managerId),
			createdAt: toISOStringSafe(identity.createdAt) || new Date().toISOString(),
			updatedAt: toISOStringSafe(identity.updatedAt) || new Date().toISOString(),
			lastLogin: toISOStringSafe(identity.lastLogin),
			joinDate: toISOStringSafe(identity.joinDate),
			endDate: toISOStringSafe(identity.endDate),
			probationEndDate: toISOStringSafe(identity.probationEndDate),
			dateOfBirth: toISOStringSafe(identity.dateOfBirth),
			contractStartDate: toISOStringSafe(identity.contractStartDate),
			contractEndDate: toISOStringSafe(identity.contractEndDate),
			// Convert arrays of ObjectIds if they exist
			secondaryAssignments: identity.secondaryAssignments?.map((assignment: any) => ({
				...assignment,
				orgUnitId: toStringSafe(assignment.orgUnitId),
				positionId: toStringSafe(assignment.positionId)
			}))
		}))
	};
};

export const actions: Actions = {
	toggleActive: async ({ request }) => {
		const formData = await request.formData();
		const identityId = formData.get('identityId') as string;

		if (!identityId) {
			return fail(400, { error: 'Identity ID is required' });
		}

		try {
			const identity = await identityRepository.findById(identityId);
			if (!identity) {
				return fail(404, { error: 'Identity not found' });
			}

			await identityRepository.updateById(identityId, {
				isActive: !identity.isActive
			});

			return { success: true, message: `Identity ${identity.isActive ? 'deactivated' : 'activated'} successfully` };
		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const identityId = formData.get('identityId') as string;

		if (!identityId) {
			return fail(400, { error: 'Identity ID is required' });
		}

		try {
			const deleted = await identityRepository.deleteById(identityId);
			if (!deleted) {
				return fail(404, { error: 'Identity not found' });
			}

			return { success: true, message: 'Identity deleted successfully' };
		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	},

	create: async ({ request }) => {
		const formData = await request.formData();
		const identityType = formData.get('identityType') as 'employee' | 'partner' | 'external' | 'service_account';

		// Common fields
		const username = formData.get('username') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const organizationId = formData.get('organizationId') as string;

		if (!username || !firstName || !lastName || !organizationId || !password) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			// Hash password
			const hashedPassword = await hash(password, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			const baseIdentity = {
				identityType,
				username,
				email: email || undefined,
				password: hashedPassword,
				isActive: true,
				emailVerified: false,
				roles: ['user'],
				firstName,
				lastName,
				fullName: `${firstName} ${lastName}`,
				organizationId
			};

			// Add type-specific fields
			if (identityType === 'employee') {
				const employeeId = formData.get('employeeId') as string;
				if (!employeeId) {
					return fail(400, { error: 'NIK (Employee ID) is required for employees' });
				}

				await identityRepository.create({
					...baseIdentity,
					employeeId,
					orgUnitId: formData.get('orgUnitId') as string || undefined,
					positionId: formData.get('positionId') as string || undefined,
					employmentType: (formData.get('employmentType') as any) || 'permanent',
					employmentStatus: 'active',
					joinDate: new Date(),
					workLocation: formData.get('workLocation') as string || undefined,
					secondaryAssignments: [],
					customProperties: {}
				});
			} else if (identityType === 'partner') {
				await identityRepository.create({
					...baseIdentity,
					partnerType: (formData.get('partnerType') as any) || 'vendor',
					companyName: formData.get('companyName') as string || undefined,
					accessLevel: 'read',
					allowedModules: []
				});
			} else {
				await identityRepository.create({
					...baseIdentity,
					customProperties: {}
				});
			}

			return { success: true, message: 'Identity created successfully' };
		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	}
};
