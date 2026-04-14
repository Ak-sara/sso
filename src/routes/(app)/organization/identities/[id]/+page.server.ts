import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { error, fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { logIdentityOperation } from '$lib/audit/logger';
import { getMaskingConfig } from '$lib/utils/masking-helper';
import { getIdentityById,getAssignments, createIdentity, updateIdentity } from '$lib/services/identity-service';
import { listOrganizations } from '$lib/services/organization-service';
import { listPositions } from '$lib/services/position-service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const mode = locals.query?.mode || 'view';
	const isNew = params.id === 'new';

	const maskingConfig = await getMaskingConfig();
	const userRoles = locals.user?.roles || [];

	const [identityResult, assignments, organizations, orgUnits, positions] = await Promise.all([
		isNew ? null : getIdentityById(params.id, { maskingConfig, userRoles, applyMask: mode === 'view' }),
		isNew ? null : getAssignments(params.id),
		listOrganizations(),
		db.orgUnits.find(),
		listPositions(),
	]);

	if (!isNew && identityResult && !identityResult.ok) throw error(404, 'Identitas tidak ditemukan');

	return {
		mode: isNew ? 'edit' : mode,
		isNew,
		identity: identityResult && identityResult.ok ? identityResult.data : null,
		assignments: assignments && assignments.ok ? assignments.data : null,
		organizations: organizations.map(o => ({ _id: o._id, name: o.name, code: o.code })),
		orgUnits: (orgUnits as any[]).map(u => ({ _id: u._id.toString(), name: u.name, code: u.code })),
		positions: positions.map(p => ({ _id: p._id, name: p.name, code: p.code })),
	};
};

export const actions: Actions = {
	create: async ({ locals, getClientAddress }) => {
		const formData = locals.body;
		const identityType = formData.identityType;
		const ipAddress = getClientAddress();
		const performedBy = locals.user?.userId?.toString() || 'system';

		const password = formData.password;
		if (!password) return fail(400, { error: 'Password wajib diisi' });

		try {
			const hashedPassword = await hash(password, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });
			const base: any = {
				identityType,
				username: formData.username,
				email: formData.email || undefined,
				password: hashedPassword,
				firstName: formData.firstName,
				lastName: formData.lastName,
				fullName: `${formData.firstName} ${formData.lastName}`,
				phone: formData.phone || undefined,
				isActive: formData.isActive === 'true',
				organizationId: formData.organizationId,
				roles: ['user'],
				emailVerified: false,
			};

			if (identityType === 'employee') {
				Object.assign(base, {
					employeeId: formData.employeeId,
					orgUnitId: formData.orgUnitId || undefined,
					positionId: formData.positionId || undefined,
					employmentType: formData.employmentType || 'permanent',
					employmentStatus: formData.employmentStatus || 'active',
					workLocation: formData.workLocation || undefined,
					joinDate: new Date(), secondaryAssignments: [], customProperties: {}
				});
			} else if (identityType === 'partner') {
				Object.assign(base, {
					companyName: formData.companyName || undefined,
					partnerType: formData.partnerType || 'vendor',
					accessLevel: 'read', allowedModules: []
				});
			}

			const result = await createIdentity(base);
			if (!result.ok) return fail(result.status || 500, { error: result.error });

			await logIdentityOperation('create_identity', performedBy, result.data._id, {
				identityType, ipAddress, userAgent: locals.vars.user_agent
			});

			throw redirect(303, `/identities/${result.data._id}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal membuat identitas' });
		}
	},

	update: async ({ locals, getClientAddress }) => {
		const formData = locals.body;
		const identityType = formData.identityType;
		const id = locals.routes.id as string;
		const ipAddress = getClientAddress();
		const performedBy = locals.user?.userId?.toString() || 'system';

		const updates: any = {
			username: formData.username,
			email: formData.email || undefined,
			firstName: formData.firstName,
			lastName: formData.lastName,
			fullName: `${formData.firstName} ${formData.lastName}`,
			phone: formData.phone || undefined,
			isActive: formData.isActive === 'true',
			organizationId: formData.organizationId,
		};

		if (identityType === 'employee') {
			Object.assign(updates, {
				employeeId: formData.employeeId,
				orgUnitId: formData.orgUnitId || undefined,
				positionId: formData.positionId || undefined,
				employmentType: formData.employmentType,
				employmentStatus: formData.employmentStatus,
				workLocation: formData.workLocation || undefined,
			});
		} else if (identityType === 'partner') {
			Object.assign(updates, { companyName: formData.companyName || undefined, partnerType: formData.partnerType });
		}

		try {
			const result = await updateIdentity(id, updates);
			if (!result.ok) return fail(result.status || 500, { error: result.error });

			await logIdentityOperation('update_identity', performedBy, id, {
				identityType, changes: updates, ipAddress, userAgent: locals.vars.user_agent
			});

			throw redirect(303, `/identities/${id}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal memperbarui identitas' });
		}
	}
};
