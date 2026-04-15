import type { PageServerLoad, Actions } from './$types';
import { getOrganizationOptions } from '$lib/utils/select-options';
import { fail } from '@sveltejs/kit';
import { useLogger, type PaginationInput } from '@ak-sara/fbao/foundation';
import { listOrgUnits, createOrgUnit, updateOrgUnit, deleteOrgUnit } from '$lib/services/org-unit-service';
import { OrgUnitSchema, type OrgUnit } from '$lib/db/schemas/org-unit';
import { fromForm } from '$lib/utils/form-parser';

const log = useLogger({ module: 'app:org-units' });

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:pagination');
	const params = {
		page: Number(locals.query?.page) || 1,
		pageSize: Number(locals.query?.pageSize) || 10,
		sortKey: locals.query?.sortKey || undefined,
		sortDirection: locals.query?.sortDirection as 'asc' | 'desc' | undefined,
		search: locals.query?.search || undefined
	} as PaginationInput;

	const [result, organizationOptions] = await Promise.all([
		listOrgUnits(params, locals.activeRealmId?.toString()),
		getOrganizationOptions()
	]);
	return {
		orgUnits: result.items,
		organizationOptions,
		pagination: {
			page: result.page,
			pageSize: result.pageSize,
			total: result.total,
			totalPages: result.totalPages
		}
	};
};

export const actions: Actions = {
	create: async ({ locals }) => {
		try {
			const unit = fromForm<OrgUnit>(OrgUnitSchema, locals.body);
			// business logic: override organizationId with active realm if not supplied
			if (!unit.organizationId && locals.activeRealmId)
				unit.organizationId = locals.activeRealmId.toString();
			const result = await createOrgUnit(unit as OrgUnit);
			if (!result.ok) return fail(result.status ?? 400, { error: result.error });
			return { success: true };
		} catch (err) {
			log.error('Unexpected error in create action', { error: err });
			return fail(500, { error: 'Unexpected error' });
		}
	},

	update: async ({ locals }) => {
		try {
			const unit = fromForm<OrgUnit>(OrgUnitSchema, locals.body);
			if (!unit._id) return fail(400, { error: 'Code is required' });
			const { _id, ...fields } = unit;
			const result = await updateOrgUnit(_id.toString(), fields);
			if (!result.ok) return fail(result.status ?? 400, { error: result.error });
			return { success: true };
		} catch (err) {
			log.error('Unexpected error in update action', { error: err });
			return fail(500, { error: 'Unexpected error' });
		}
	},

	delete: async ({ locals }) => {
		try {
			const f = locals.body
			const code = f?._id;
			if (!code) return fail(400, { error: 'Code is required' });
			const result = await deleteOrgUnit(code);
			if (!result.ok) return fail(result.status ?? 400, { error: result.error });
			return { success: true };
		} catch (err) {
			log.error('Unexpected error in delete action', { error: err });
			return fail(500, { error: 'Unexpected error' });
		}
	}
};
