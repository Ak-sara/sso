import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getOrganizationById, updateOrganization } from '$lib/services/organization-service';

export const load: PageServerLoad = async ({ params }) => {
	const result = await getOrganizationById(params.id);
	if (!result.ok) throw redirect(302, '/realms');
	return { organization: result.data };
};

export const actions: Actions = {
	update: async ({ locals }) => {
		const formData = locals.body;

		const branding = {
			appName: formData.appName,
			logoBase64: formData.logoBase64 || undefined,
			faviconBase64: formData.faviconBase64 || undefined,
			primaryColor: formData.primaryColor,
			secondaryColor: formData.secondaryColor,
			accentColor: formData.accentColor || undefined,
			backgroundColor: formData.backgroundColor || undefined,
			textColor: formData.textColor || undefined,
			emailFromName: formData.emailFromName || undefined,
			emailFromAddress: formData.emailFromAddress || undefined,
			supportEmail: formData.supportEmail || undefined,
		};

		const result = await updateOrganization(locals.routes.code as string, { branding } as any);
		if (!result.ok) return fail(result.status || 500, { error: result.error });
		return { success: 'Branding berhasil diperbarui' };
	}
};
