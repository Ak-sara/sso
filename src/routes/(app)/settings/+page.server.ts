import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listOrganizations, updateOrganization } from '$lib/services/organization-service';
import { loadSettings, updateSettingsFromForm } from '$lib/services/settings-service';
import { testEmailConfig } from '$lib/email/email-service';

export const load: PageServerLoad = async () => {
	const [realms, settings] = await Promise.all([
		listOrganizations(true),
		loadSettings()
	]);
	return {
		realms,
		settings: settings.map((s: any) => ({ ...s, _id: s._id?.toString() }))
	};
};

export const actions: Actions = {
	update: async ({ locals }) => {
		try {
			await updateSettingsFromForm(locals.body);
			return { success: 'Settings updated successfully' };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to update settings' });
		}
	},

	testEmail: async ({ request }) => {
		// Read raw formData to avoid sanitizeObject mangling the JSON config string
		const fd = await request.formData();
		const provider = fd.get('provider') as string;
		const configRaw = fd.get('config') as string;
		const testEmailAddr = fd.get('testEmail') as string;

		if (!provider || !configRaw || !testEmailAddr)
			return fail(400, { testError: 'Missing required fields' });

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(testEmailAddr))
			return fail(400, { testError: 'Invalid email address' });

		try {
			const cfg = JSON.parse(configRaw);
			await testEmailConfig(provider, cfg, testEmailAddr);
			return { testSuccess: `Test email sent to ${testEmailAddr}` };
		} catch (err: any) {
			return fail(500, { testError: err.message || 'Failed to send test email' });
		}
	},

	updateRealmMailer: async ({ request }) => {
		// Read raw formData to avoid sanitizeObject mangling the JSON config string
		const fd = await request.formData();
		const code = fd.get('code') as string;
		const provider = fd.get('provider') as string;
		const configRaw = fd.get('config') as string;

		if (!code || !provider) return fail(400, { error: 'Code and provider are required' });

		try {
			const cfg = JSON.parse(configRaw);
			const emailTransport = { provider, [provider]: cfg };
			const result = await updateOrganization(code, { emailTransport } as any);
			if (!result.ok) return fail(result.status || 400, { error: result.error });
			return { success: `Mailer for ${code} updated` };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to update realm mailer' });
		}
	}
};
