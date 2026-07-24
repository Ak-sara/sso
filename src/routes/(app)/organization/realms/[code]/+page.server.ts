import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect, isRedirect } from '@sveltejs/kit';
import { getOrganizationByCode, createOrganization, updateOrganization } from '$lib/services/organization-service';
import { testEmailConfig } from '$lib/email/email-service';
import { db } from '$lib/db/db';
import { ObjectId } from 'mongodb';
import { parseJsonArrayField } from '$lib/utils/form-json';

export const load: PageServerLoad = async ({ params }) => {
	const isNew = params.code === 'new';

	const [realmResult, clients] = await Promise.all([
		isNew ? null : getOrganizationByCode(params.code),
		db.oauthClients.find({}, { clientName: 1 })
	]);

	if (!isNew && realmResult && !realmResult.ok) throw error(404, 'Realm tidak ditemukan');

	const realm = realmResult && realmResult.ok ? realmResult.data : null;

	const realmRoles = realm
		? await db.realmRoles.find({ organizationId: realm._id } as any, { name: 1 })
		: [];

	return {
		isNew,
		realm,
		clients: clients.map((c: any) => ({ clientId: c.clientId, clientName: c.clientName })),
		realmRoles: realmRoles.map((r: any) => ({
			_id: r._id.toString(),
			organizationId: r.organizationId,
			name: r.name,
			description: r.description,
			allowedClientIds: r.allowedClientIds || [],
			isActive: r.isActive
		}))
	};
};

export const actions: Actions = {
	upsertRealm: async ({ locals, params }) => {
		const formData = locals.body;
		const isNew = params.code === 'new';
		const name = formData?.name;
		if (!name) return fail(400, { error: 'Realm name is required' });

		const allowedEmailDomains = formData?.allowedEmailDomains
			? JSON.parse(formData.allowedEmailDomains)
			: [];

		try {
			if (isNew) {
				const code = formData?.code;
				if (!code) return fail(400, { error: 'Realm code is required' });
				const result = await createOrganization({ name, code, type: formData?.type as any, description: formData?.description || '' });
				if (!result.ok) return fail(result.status || 400, { error: result.error });
				throw redirect(303, `/organization/realms/${code}`);
			} else {
				const code = params.code;

				const existing = await getOrganizationByCode(code);
				const currentBranding = (existing.ok ? (existing.data as any)?.branding : undefined) ?? {};
				const branding = {
					...currentBranding,
					emailFromName: formData?.emailFromName || '',
					emailFromAddress: formData?.emailFromAddress || '',
					supportEmail: formData?.supportEmail || '',
					supportUrl: formData?.supportUrl || ''
				};

				const result = await updateOrganization(code, {
					name,
					legalName: formData?.legalName || name,
					type: formData?.type as any,
					description: formData?.description || '',
					isActive: formData?.isActive === 'true',
					allowedEmailDomains,
					branding
				});
				if (!result.ok) return fail(result.status || 400, { error: result.error });
				throw redirect(303, `/organization/realms/${code}`);
			}
		} catch (err) {
			if (isRedirect(err)) throw err;
			return fail(500, { error: 'Failed to save realm' });
		}
	},

	updateBranding: async ({ locals, params }) => {
		const formData = locals.body;
		const code = params.code;

		const existing = await getOrganizationByCode(code);
		const currentBranding = (existing.ok ? (existing.data as any)?.branding : undefined) ?? {};

		const branding: any = {
			appName: formData?.appName || '',
			primaryColor: formData?.primaryColor || '#4f46e5',
			secondaryColor: formData?.secondaryColor || '#7c3aed',
			accentColor: formData?.accentColor || '#06b6d4',
			textColor: formData?.textColor || '#ffffff',
			// email fields are owned by the Realm Info form (?/upsertRealm) — preserve them here
			emailFromName: currentBranding.emailFromName || '',
			emailFromAddress: currentBranding.emailFromAddress || '',
			supportEmail: currentBranding.supportEmail || '',
			supportUrl: currentBranding.supportUrl || ''
		};
		if (formData?.logoBase64) branding.logoBase64 = formData.logoBase64;
		if (formData?.loginBackgroundBase64) branding.loginBackgroundBase64 = formData.loginBackgroundBase64;

		const result = await updateOrganization(code, { branding });
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: true };
	},

	updateRealmMailer: async ({ locals }) => {
		// Read raw formData to avoid sanitizeObject mangling the JSON config string
		const fd = locals.body;
		const code = fd.code as string;
		const provider = fd.provider as string;
		const configRaw = fd.config.replaceAll('&quot;', '"') as string;

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
	},

	testEmail: async ({ locals }) => {
		// Read raw formData to avoid sanitizeObject mangling the JSON config string
		const fd = locals.body;
		const provider = fd.provider as string;
		const configRaw = fd.config.replaceAll('&quot;', '"') as string;
		const testEmailAddr = fd.testEmail as string;

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

	// Realm Roles — app-access bundles scoped to one realm (organization)
	createRealmRole: async ({ locals }) => {
		const body = locals.body;
		const organizationId = (body?.organizationId as string || '').trim();
		const name = (body?.name as string || '').trim();
		const description = (body?.description as string) || undefined;
		const allowedClientIds = parseJsonArrayField(body?.allowedClientIds);

		if (!organizationId) return fail(400, { error: 'Organization is required' });
		if (!name) return fail(400, { error: 'Role name is required' });

		await db.realmRoles.insertOne({
			organizationId, name, description,
			allowedClientIds,
			isActive: true
		} as any);

		return { success: 'Realm role created' };
	},

	updateRealmRole: async ({ locals }) => {
		const body = locals.body;
		const id = body?._id as string;
		if (!id || !ObjectId.isValid(id)) return fail(400, { error: 'Invalid role id' });

		const name = (body?.name as string || '').trim();
		const description = (body?.description as string) || undefined;
		const isActive = body?.isActive === 'true' || body?.isActive === true;
		const allowedClientIds = parseJsonArrayField(body?.allowedClientIds);

		if (!name) return fail(400, { error: 'Role name is required' });

		const updated = await db.realmRoles.updateById(id, {
			name, description,
			allowedClientIds,
			isActive,
			updatedAt: new Date()
		} as any);
		if (!updated) return fail(404, { error: 'Realm role not found' });

		return { success: 'Realm role updated' };
	},

	deleteRealmRole: async ({ locals }) => {
		const body = locals.body;
		const id = body?._id as string;
		if (!id || !ObjectId.isValid(id)) return fail(400, { error: 'Invalid role id' });

		const deleted = await db.realmRoles.deleteById(id);
		if (!deleted) return fail(404, { error: 'Realm role not found' });

		return { success: 'Realm role deleted' };
	}
};
