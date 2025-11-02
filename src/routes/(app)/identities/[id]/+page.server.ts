import type { PageServerLoad, Actions } from './$types';
import { identityRepository } from '$lib/db/identity-repository';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { hash } from '@node-rs/argon2';
import { logIdentityOperation } from '$lib/audit/logger';

export const load: PageServerLoad = async ({ params, url }) => {
	const mode = url.searchParams.get('mode') || 'view';
	const isNew = params.id === 'new';

	// Get identity (skip if creating new)
	let identity = null;
	if (!isNew) {
		identity = await identityRepository.findById(params.id);
		if (!identity) {
			throw error(404, 'Identitas tidak ditemukan');
		}
	}

	const db = getDB();

	// Get organization options
	const organizations = await db.collection('organizations').find({}).toArray();

	// Get org units and positions (always fetch for create mode)
	const [orgUnits, positions] = await Promise.all([
		db.collection('org_units').find({}).toArray(),
		db.collection('positions').find({}).toArray()
	]);

	// Helper functions
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

	const toStringSafe = (value: any): string | undefined => {
		if (!value) return undefined;
		if (typeof value === 'string') return value;
		return value.toString();
	};

	return {
		mode: isNew ? 'edit' : mode,
		isNew,
		identity: identity ? {
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
			contractEndDate: toISOStringSafe(identity.contractEndDate)
		} : null,
		organizations: organizations.map(org => ({
			_id: org._id.toString(),
			name: org.name,
			code: org.code
		})),
		orgUnits: orgUnits.map(unit => ({
			_id: unit._id.toString(),
			name: unit.name,
			code: unit.code
		})),
		positions: positions.map(pos => ({
			_id: pos._id.toString(),
			name: pos.name,
			code: pos.code
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals, getClientAddress }) => {
		const formData = await request.formData();
		const identityType = formData.get('identityType') as string;

		const ipAddress = getClientAddress();
		const userAgent = request.headers.get('user-agent') || undefined;
		const performedBy = locals.user?.userId?.toString() || 'system';

		try {
			const password = formData.get('password') as string;
			if (!password) {
				return fail(400, { error: 'Password wajib diisi' });
			}

			const hashedPassword = await hash(password, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			const baseData: any = {
				identityType,
				username: formData.get('username') as string,
				email: formData.get('email') as string || undefined,
				password: hashedPassword,
				firstName: formData.get('firstName') as string,
				lastName: formData.get('lastName') as string,
				fullName: `${formData.get('firstName')} ${formData.get('lastName')}`,
				phone: formData.get('phone') as string || undefined,
				isActive: formData.get('isActive') === 'true',
				organizationId: formData.get('organizationId') as string,
				roles: ['user'],
				emailVerified: false
			};

			// Type-specific fields
			if (identityType === 'employee') {
				baseData.employeeId = formData.get('employeeId') as string;
				baseData.orgUnitId = formData.get('orgUnitId') as string || undefined;
				baseData.positionId = formData.get('positionId') as string || undefined;
				baseData.employmentType = formData.get('employmentType') as string || 'permanent';
				baseData.employmentStatus = formData.get('employmentStatus') as string || 'active';
				baseData.workLocation = formData.get('workLocation') as string || undefined;
				baseData.joinDate = new Date();
				baseData.secondaryAssignments = [];
				baseData.customProperties = {};
			} else if (identityType === 'partner') {
				baseData.companyName = formData.get('companyName') as string || undefined;
				baseData.partnerType = formData.get('partnerType') as string || 'vendor';
				baseData.accessLevel = 'read';
				baseData.allowedModules = [];
			}

			const newIdentity = await identityRepository.create(baseData);

			// Log audit
			await logIdentityOperation(
				'create_identity',
				performedBy,
				newIdentity._id!.toString(),
				{
					identityType,
					ipAddress,
					userAgent
				}
			);

			throw redirect(303, `/identities/${newIdentity._id}`);
		} catch (err) {
			console.error('Create identity error:', err);
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal membuat identitas' });
		}
	},

	update: async ({ request, params, locals, getClientAddress }) => {
		const formData = await request.formData();
		const identityType = formData.get('identityType') as string;

		const ipAddress = getClientAddress();
		const userAgent = request.headers.get('user-agent') || undefined;
		const performedBy = locals.user?.userId?.toString() || 'system';

		try {
			const updates: any = {
				username: formData.get('username') as string,
				email: formData.get('email') as string || undefined,
				firstName: formData.get('firstName') as string,
				lastName: formData.get('lastName') as string,
				fullName: `${formData.get('firstName')} ${formData.get('lastName')}`,
				phone: formData.get('phone') as string || undefined,
				isActive: formData.get('isActive') === 'true',
				organizationId: formData.get('organizationId') as string,
				updatedAt: new Date()
			};

			// Type-specific fields
			if (identityType === 'employee') {
				updates.employeeId = formData.get('employeeId') as string;
				updates.orgUnitId = formData.get('orgUnitId') as string || undefined;
				updates.positionId = formData.get('positionId') as string || undefined;
				updates.employmentType = formData.get('employmentType') as string;
				updates.employmentStatus = formData.get('employmentStatus') as string;
				updates.workLocation = formData.get('workLocation') as string || undefined;
			} else if (identityType === 'partner') {
				updates.companyName = formData.get('companyName') as string || undefined;
				updates.partnerType = formData.get('partnerType') as string;
			}

			await identityRepository.updateById(params.id, updates);

			// Log audit
			await logIdentityOperation(
				'update_identity',
				performedBy,
				params.id,
				{
					identityType,
					changes: updates,
					ipAddress,
					userAgent
				}
			);

			throw redirect(303, `/identities/${params.id}`);
		} catch (err) {
			console.error('Update identity error:', err);
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal memperbarui identitas' });
		}
	}
};
