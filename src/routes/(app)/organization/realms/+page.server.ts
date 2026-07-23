import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listOrganizations, deleteOrganization } from '$lib/services/organization-service';

export const load: PageServerLoad = async () => {
	const realms = await listOrganizations(true);
	return { realms };
};

export const actions: Actions = {
	delete: async ({ locals }) => {
		const formData = locals.body;
		const code = formData?.code;
		if (!code) return fail(400, { error: 'Realm code is required' });
		const result = await deleteOrganization(code);
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: true };
	}
};
