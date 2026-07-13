import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listOrganizations, createOrganization, deleteOrganization, updateOrganization } from '$lib/services/organization-service';
import { db } from '$lib/db/db';
import { ObjectId } from 'mongodb';
import { parseJsonArrayField } from '$lib/utils/form-json';

export const load: PageServerLoad = async () => {
	const [realms, clients] = await Promise.all([
		listOrganizations(true),
		db.oauthClients.find({}, { clientName: 1 })
	]);

	return {
		realms,
		clients: clients.map((c: any) => ({ clientId: c.clientId, clientName: c.clientName }))
	};
};

export const actions: Actions = {
	upsertRealm: async ({ locals }) => {
		const formData = locals.body;
		const id = formData?._id;
		const name = formData?.name;
		const code = formData?.code;

		if (!name) return fail(400, { error: 'Realm name is required' });

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
			if (!code) return fail(400, { error: 'Realm code is required' });
			const result = await createOrganization({ name, code, type: formData?.type as any, description: formData?.description || '' });
			if (!result.ok) return fail(result.status || 400, { error: result.error });
			return { success: true };
		}
	},

	updateBranding: async ({ locals }) => {
		const formData = locals.body;
		const code = formData?.code;
		if (!code) return fail(400, { error: 'Realm code is required' });

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
		if (!code) return fail(400, { error: 'Realm code is required' });
		const result = await deleteOrganization(code);
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: true };
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
