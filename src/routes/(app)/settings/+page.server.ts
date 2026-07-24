import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { loadSettings, updateSettings, updateEmailProvider } from '$lib/services/settings-service';

export const load: PageServerLoad = async () => {
	const settings = await loadSettings();
	return {
		settings: settings.map((s: any) => ({ ...s, _id: s._id?.toString() }))
	};
};

export const actions: Actions = {
	update: async ({ locals }) => {
		try {
			await updateSettings(locals.body);
			return { success: 'Settings updated successfully' };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to update settings' });
		}
	},

	'update-default-email-provider': async ({ locals }) => {
		const fd = locals.body;
		const provider = fd.settings_email_service_provider as string;
		if (!provider) return fail(400, { error: 'Provider is required' });

		const prefix = `settings_email_service_config_${provider}_`;
		const providerConfig: Record<string, unknown> = {};
		for (const [k, v] of fd.entries()) {
			if (k.startsWith(prefix)) providerConfig[k.slice(prefix.length)] = v;
		}

		try {
			await updateEmailProvider(provider, providerConfig);
			return { success: 'Email provider updated' };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to update email provider' });
		}
	}

};
