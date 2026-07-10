import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { error, fail, redirect, isRedirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { logAudit } from '$lib/audit/logger';
import { getMaskingConfig } from '$lib/utils/masking-helper';
import { getIdentityById, createIdentity, updateIdentity, upsertAssignment, deleteAssignment } from '$lib/services/identity-service';
import { listOrganizations } from '$lib/services/organization-service';
import { listPositions } from '$lib/services/position-service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const mode = locals.query?.mode || 'view';
	const isNew = params.id === 'new';

	const maskingConfig = await getMaskingConfig();
	const userRoles = locals.user?.roles || [];

	const [identityResult, organizations, orgUnits, positions] = await Promise.all([
		isNew ? null : getIdentityById(params.id, { maskingConfig, userRoles, applyMask: mode === 'view' }),
		listOrganizations(),
		db.orgUnits.find({ type: { $ne: 'logical' } } as any), // rendering-only containers aren't real assignable units
		listPositions(),
	]);

	if (!isNew && identityResult && !identityResult.ok) throw error(404, 'Identitas tidak ditemukan');

	return {
		mode: isNew ? 'edit' : mode,
		isNew,
		identity: identityResult && identityResult.ok ? identityResult.data : null,
		assignments: identityResult && identityResult.ok ? identityResult.data.assignments : null,
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
				email: formData.email || undefined,
				password: hashedPassword,
				firstName: formData.firstName,
				lastName: formData.lastName,
				fullName: `${formData.firstName} ${formData.lastName}`,
				phone: formData.phone || undefined,
				isActive: formData.isActive === 'true',
				organizationId: formData.organizationId || undefined,
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
			console.debug("create",result)
			if (!result.ok) return fail(result.status || 500, { error: result.error });

			await logAudit({ action: 'create_identity', resource: 'identities', identityId: performedBy, resourceId: result.data._id, details: { identityType }, ipAddress, userAgent: locals.vars.user_agent });

			throw redirect(303, `/organization/identities/${result.data._id}`);
		} catch (err) {
			if (isRedirect(err)) throw err;
			return fail(500, { error: 'Fail to create identity' });
		}
	},

	update: async ({ locals, getClientAddress }) => {
		const updates = locals.body;
		const identityType = updates.identityType;
		const id = locals.routes.id as string;
		const ipAddress = getClientAddress();
		const performedBy = locals.user?.userId?.toString() || 'system';
		
		if (typeof updates.roles === 'string') {
			try { updates.roles = JSON.parse(updates.roles.replaceAll('&quot;', '"')); }
			catch {
				console.error("cant parse roles:", updates.roles);
				updates.roles = [];
			}
		}
		try {
			const result = await updateIdentity(id, updates);
			if (!result.ok) throw new Error(result.error);
			await logAudit({ action: 'update_identity', resource: 'identities', identityId: performedBy, resourceId: id, details: { identityType, changes: updates }, ipAddress, userAgent: locals.vars.user_agent });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message });
		}
		throw redirect(303, `/organization/identities/${id}`);
	},

	upsertAssignment: async ({ locals }) => {
		const id = locals.routes.id as string;
		const body = locals.body;
		console.log(body)
		body.startDate=String(body.startDate);
		console.log(body)
		try {
			const result = await upsertAssignment(id, body);
			if (!result.ok) throw new Error(result.error);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message });
		}
		return {};
	},

	deleteAssignment: async ({ locals }) => {
		const id = locals.routes.id as string;
		const assignmentId = locals.body?.assignmentId as string;
		if (!assignmentId) return fail(400, { error: 'Missing assignmentId' });
		try {
			const result = await deleteAssignment(id, assignmentId);
			if (!result.ok) throw new Error(result.error);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: message });
		}
		return {};
	},
};
