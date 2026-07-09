import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { getMaskingConfig } from '$lib/utils/masking-helper';
import { listIdentities, getTabCounts, deleteIdentity, createIdentity, getIdentityById, updateIdentity } from '$lib/services/identity-service';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:pagination');
	const tab = locals.query?.tab || 'employee';
	const params = {
		page: Number(locals.query?.page) || 1,
		pageSize: Number(locals.query?.pageSize) || 10,
		sortKey: locals.query?.sortKey,
		sortDirection: (locals.query?.sortDirection as 'asc' | 'desc') || 'asc',
		search: locals.query?.search
	};

	const realmFilter: Record<string, any> = {};
	if (locals.activeRealmId) realmFilter.organizationId = locals.activeRealmId;

	const maskingConfig = await getMaskingConfig();
	const userRoles = locals.user?.roles || [];

	const [result, tabCounts] = await Promise.all([
		listIdentities(params, { ...realmFilter, identityType: tab }, maskingConfig, userRoles),
		getTabCounts(realmFilter),
	]);

	return {
		identities: result.items,
		tab,
		tabCounts,
		pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages }
	};
};

export const actions: Actions = {
	toggleActive: async ({ locals }) => {
		const formData = locals.body
		const identityId = formData?.identityId;

		if (!identityId) {
			return fail(400, { error: 'Identity ID is required' });
		}

		const current = await getIdentityById(identityId);
		if (!current.ok) return fail(current.status || 404, { error: current.error });

		const result = await updateIdentity(identityId, { isActive: !current.data.isActive });
		if (!result.ok) return fail(result.status || 500, { error: result.error });

		return { success: true, message: `Identity ${current.data.isActive ? 'deactivated' : 'activated'} successfully` };
	},

	delete: async ({ locals }) => {
		const formData = locals.body;
		const identityId = formData?.identityId;
		if (!identityId) return fail(400, { error: 'Identity ID is required' });
		const result = await deleteIdentity(identityId);
		if (!result.ok) return fail(result.status || 500, { error: result.error });
		return { success: true, message: 'Identity deleted successfully' };
	},

	create: async ({ locals }) => {
		const formData = locals.body;
		const identityType = formData?.identityType as 'employee' | 'partner' | 'external' | 'service_account';
		const email = formData?.email;
		const password = formData?.password;
		const firstName = formData?.firstName;
		const lastName = formData?.lastName;
		const organizationId = formData?.organizationId;

		if (!firstName || !lastName || !organizationId || !password) {
			return fail(400, { error: 'Missing required fields' });
		}

		const hashedPassword = await hash(password, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });

		const base: any = {
			identityType, email: email || undefined, password: hashedPassword,
			isActive: true, emailVerified: false, roles: ['user'],
			firstName, lastName, fullName: `${firstName} ${lastName}`, organizationId
		};

		if (identityType === 'employee') {
			if (!formData?.employeeId) return fail(400, { error: 'NIK (Employee ID) is required for employees' });
			Object.assign(base, {
				employeeId: formData.employeeId,
				orgUnitId: formData.orgUnitId || undefined,
				positionId: formData.positionId || undefined,
				employmentType: formData.employmentType || 'permanent',
				employmentStatus: 'active',
				joinDate: new Date(),
				workLocation: formData.workLocation || undefined,
				assignments: [], customProperties: {}
			});
		} else if (identityType === 'partner') {
			Object.assign(base, {
				partnerType: formData?.partnerType || 'vendor',
				companyName: formData?.companyName || undefined,
				accessLevel: 'read', allowedModules: []
			});
		} else {
			base.customProperties = {};
		}

		const result = await createIdentity(base);
		if (!result.ok) return fail(result.status || 500, { error: result.error });
		return { success: true, message: 'Identity created successfully' };
	}
};
