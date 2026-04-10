import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listOrganizations } from '$lib/services/organization-service';
import { loadSettings, updateSettingsFromForm } from '$lib/services/settings-service';

export const load: PageServerLoad = async () => {
	const [realms, settings] = await Promise.all([
		listOrganizations(),
		loadSettings(),
	]);

	return {
		realms,
		settings: settings.map((s: any) => ({ ...s, _id: s._id?.toString() }))
	};
};

export const actions: Actions = {
	update: async ({ locals }) => {
		const formData = locals.body;

		try {
			await updateSettingsFromForm(formData);
			return { success: 'Settings updated successfully' };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to update settings' });
		}
	}
};
