import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db/db';
import { listAuditLogs } from '$lib/services/audit-service';
import { logAudit } from '$lib/audit/logger';
import { testEntraIDConnection } from '$lib/entraid/microsoft-graph';

export const load: PageServerLoad = async () => {
	const org = await db.organizations.findOne({ code: 'IAS' } as any) as any;
	if (!org) return { config: null, organizationId: null, syncHistory: [] };

	const config = await db.entraidConfigs.findOne({ organizationId: org._id.toString() } as any) as any;
	const { items: syncHistory } = await listAuditLogs(
		{ page: 1, pageSize: 10 },
		{ action: { $in: ['sync_completed', 'sync_failed', 'sync_started'] }, organizationId: org._id.toString() }
	);

	return {
		config: config ? { ...config, _id: config._id?.toString(), clientSecret: '••••••••••••' } : null,
		organizationId: org._id.toString(),
		syncHistory
	};
};

export const actions: Actions = {
	testConnection: async ({ locals }) => {
		try {
			const formData = locals.body
			const tenantId = formData?.tenantId;
			const clientId = formData?.clientId;
			let clientSecret = formData?.clientSecret;
			const useExistingSecret = formData?.useExistingSecret === 'true';

			if (!tenantId || !clientId) return fail(400, { error: 'Missing required fields: tenantId, clientId' });

			if (!clientSecret && useExistingSecret) {
				const existing = await db.entraidConfigs.findOne({ tenantId, clientId } as any) as any;
				if (!existing?.clientSecret) return fail(400, { error: 'No existing client secret found.' });
				clientSecret = existing.clientSecret;
			}
			if (!clientSecret) return fail(400, { error: 'Client secret is required' });

			const result = await testEntraIDConnection({ tenantId, clientId, clientSecret });
			if (!result.success) return fail(400, { error: result.error || 'Connection test failed' });

			return { success: true, message: result.message || 'Connection successful!' };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to test connection' });
		}
	},

	saveConfig: async ({ locals }) => {
		try {
			const formData = locals.body
			const tenantId = formData?.tenantId;
			const clientId = formData?.clientId;
			const clientSecret = formData?.clientSecret;
			const organizationId = formData?.organizationId;
			const syncUsers = formData?.syncUsers === 'true';
			const syncGroups = formData?.syncGroups === 'true';
			const autoSync = formData?.autoSync === 'true';

			if (!tenantId || !clientId || !clientSecret || !organizationId) {
				return fail(400, { error: 'Missing required fields' });
			}

			const testResult = await testEntraIDConnection({ tenantId, clientId, clientSecret });

			const configData = {
				organizationId, tenantId, clientId, clientSecret,
				isConnected: testResult.success,
				lastTestedAt: new Date(),
				lastTestStatus: testResult.success ? 'success' : 'failed',
				lastTestError: testResult.error,
				syncUsers, syncGroups, autoSync,
				updatedBy: locals.user?.userId || 'system'
			};

			await db.entraidConfigs.upsertOne({ organizationId } as any, configData as any);

			return {
				success: true,
				message: testResult.success ? 'Configuration saved and connection successful!' : 'Configuration saved but connection failed.',
				connectionStatus: testResult.success ? 'connected' : 'failed'
			};
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to save configuration' });
		}
	},

	updateFieldMapping: async ({ locals }) => {
		try {
			const formData = locals.body
			const organizationId = formData?.organizationId;
			const fieldMappingJson = formData?.fieldMapping;

			if (!organizationId || !fieldMappingJson) return fail(400, { error: 'Missing required fields' });

			const fieldMapping = JSON.parse(fieldMappingJson);
			await db.entraidConfigs.updateOne({ organizationId } as any, { fieldMapping } as any);

			return { success: true, message: 'Field mapping updated successfully!' };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to update field mapping' });
		}
	},

	syncNow: async ({ locals }) => {
		try {
			const formData = locals.body
			const organizationId = formData?.organizationId;

			if (!organizationId) return fail(400, { error: 'Missing organization ID' });

			const config = await db.entraidConfigs.findOne({ organizationId } as any) as any;
			if (!config) return fail(400, { error: 'EntraID configuration not found.' });
			if (!config.isConnected) return fail(400, { error: 'Not connected to EntraID.' });

			await logAudit({ action: 'sync_started', resource: 'sync', identityId: 'manual', organizationId, details: { syncType: 'entra_id_full' } });

			return { success: true, message: 'Sync initiated!', syncId };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to initiate sync' });
		}
	}
};
