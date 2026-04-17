import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listOrganizations, createOrganization, deleteOrganization, updateOrganization } from '$lib/services/organization-service';

export const load: PageServerLoad = async () => {
	return { realms: await listOrganizations(true) };
};

export const actions: Actions = {
	upsertRealm: async ({ locals }) => {
		const formData = locals.body;
		const id = formData?._id;
		const name = formData?.name;
		const code = formData?.code;

		if (!name) return fail(400, { error: 'Nama realm wajib diisi' });

		const allowedEmailDomains = formData?.allowedEmailDomains
			? JSON.parse(formData.allowedEmailDomains)
			: [];

		if (id) {
			// Update existing
			const result = await updateOrganization(code, {
				name,
				legalName: formData?.legalName || name,
				type: formData?.type as any,
				description: formData?.description || '',
				isActive: formData?.isActive === 'true',
				allowedEmailDomains
			});
			if (!result.ok) return fail(result.status || 400, { error: result.error });
			return { success: true };
		} else {
			// Create new
			if (!code) return fail(400, { error: 'Kode realm wajib diisi' });
			const result = await createOrganization({ name, code, type: formData?.type as any, description: formData?.description || '' });
			if (!result.ok) return fail(result.status || 400, { error: result.error });
			return { success: true };
		}
	},

	updateBranding: async ({ locals }) => {
		const formData = locals.body;
		const code = formData?.code;
		if (!code) return fail(400, { error: 'Kode realm wajib diisi' });

		const branding: any = {
			appName: formData?.appName || '',
			primaryColor: formData?.primaryColor || '#4f46e5',
			secondaryColor: formData?.secondaryColor || '#7c3aed',
			accentColor: formData?.accentColor || '#06b6d4',
			textColor: formData?.textColor || '#ffffff',
			emailFromName: formData?.emailFromName || '',
			emailFromAddress: formData?.emailFromAddress || '',
			supportEmail: formData?.supportEmail || '',
			supportUrl: formData?.supportUrl || ''
		};
		if (formData?.logoBase64) branding.logoBase64 = formData.logoBase64;
		if (formData?.loginBackgroundBase64) branding.loginBackgroundBase64 = formData.loginBackgroundBase64;

		const result = await updateOrganization(code, { branding });
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: true };
	},

	delete: async ({ locals }) => {
		const formData = locals.body;
		const code = formData?.code;
		if (!code) return fail(400, { error: 'Kode realm wajib diisi' });
		const result = await deleteOrganization(code);
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: true };
	}
};
