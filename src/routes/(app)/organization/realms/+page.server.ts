import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listOrganizations, createOrganization, deleteOrganization } from '$lib/services/organization-service';

export const load: PageServerLoad = async () => {
	return { realms: await listOrganizations(true) };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const formData = locals.body;
		const result = await createOrganization({
			name: formData?.name,
			code: formData?.code,
			type: formData?.type as any,
			description: formData?.description || '',
		});
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: 'Realm berhasil dibuat' };
	},

	delete: async ({ locals }) => {
		const formData = locals.body;
		const code = formData?.code;
		if (!code) return fail(400, { error: 'Kode realm wajib diisi' });
		const result = await deleteOrganization(code);
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: 'Realm deleted successfully' };
	}
};
