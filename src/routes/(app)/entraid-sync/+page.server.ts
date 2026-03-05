import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import type { EntraIDConfig } from '$lib/db/schemas';
import { testEntraIDConnection } from '$lib/entraid/microsoft-graph';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
	const db = getDB();

	// Get current organization (IAS for now, in production would be from session/user)
	const org = await db.collection('organizations').findOne({ code: 'IAS' });

	if (!org) {
		return {
			config: null,
			organizationId: null,
		};
	}

	// Get existing config for this organization
	const config = await db.collection<EntraIDConfig>('entraid_configs').findOne({
		organizationId: org._id.toString(),
	});

	// Get recent sync history
	const syncHistory = await db
		.collection('entraid_sync_logs')
		.find({ organizationId: org._id.toString() })
		.sort({ createdAt: -1 })
		.limit(10)
		.toArray();

	return {
		config: config
			? {
					...config,
					_id: config._id?.toString(),
					clientSecret: '••••••••••••', // Mask the secret
				}
			: null,
		organizationId: org._id.toString(),
		syncHistory: syncHistory.map((log) => ({
			...log,
			_id: log._id?.toString(),
		})),
	};
};

export const actions: Actions = {
	/**
	 * Test Microsoft Entra ID connection
	 */
	testConnection: async ({ request }) => {
		try {
			const db = getDB();
			const formData = await request.formData();

			const tenantId = formData.get('tenantId')?.toString();
			const clientId = formData.get('clientId')?.toString();
			let clientSecret = formData.get('clientSecret')?.toString();
			const useExistingSecret = formData.get('useExistingSecret') === 'true';

			if (!tenantId || !clientId) {
				return fail(400, {
					error: 'Missing required fields: tenantId, clientId',
				});
			}

			// If no secret provided and useExistingSecret is true, fetch from database
			if (!clientSecret && useExistingSecret) {
				const existingConfig = await db.collection<EntraIDConfig>('entraid_configs').findOne({
					tenantId,
					clientId,
				});

				if (!existingConfig?.clientSecret) {
					return fail(400, {
						error: 'No existing client secret found. Please enter the secret.',
					});
				}

				clientSecret = existingConfig.clientSecret;
			}

			if (!clientSecret) {
				return fail(400, {
					error: 'Client secret is required',
				});
			}

			// Test connection
			const result = await testEntraIDConnection({
				tenantId,
				clientId,
				clientSecret,
			});

			if (!result.success) {
				return fail(400, {
					error: result.error || 'Connection test failed',
				});
			}

			return {
				success: true,
				message: result.message || 'Connection successful!',
			};
		} catch (error: any) {
			console.error('Test connection error:', error);
			return fail(500, {
				error: error.message || 'Failed to test connection',
			});
		}
	},

	/**
	 * Save EntraID configuration
	 */
	saveConfig: async ({ request, locals }) => {
		try {
			const db = getDB();
			const formData = await request.formData();

			const tenantId = formData.get('tenantId')?.toString();
			const clientId = formData.get('clientId')?.toString();
			const clientSecret = formData.get('clientSecret')?.toString();
			const organizationId = formData.get('organizationId')?.toString();
			const syncUsers = formData.get('syncUsers') === 'true';
			const syncGroups = formData.get('syncGroups') === 'true';
			const autoSync = formData.get('autoSync') === 'true';

			if (!tenantId || !clientId || !clientSecret || !organizationId) {
				return fail(400, {
					error: 'Missing required fields',
				});
			}

			// Test connection first
			const testResult = await testEntraIDConnection({
				tenantId,
				clientId,
				clientSecret,
			});

			const configData: Partial<EntraIDConfig> = {
				organizationId,
				tenantId,
				clientId,
				clientSecret, // TODO: Encrypt in production!
				isConnected: testResult.success,
				lastTestedAt: new Date(),
				lastTestStatus: testResult.success ? 'success' : 'failed',
				lastTestError: testResult.error,
				syncUsers,
				syncGroups,
				autoSync,
				updatedAt: new Date(),
				updatedBy: locals.user?.id || 'system',
			};

			// Check if config exists
			const existingConfig = await db.collection<EntraIDConfig>('entraid_configs').findOne({
				organizationId,
			});

			if (existingConfig) {
				// Update existing
				await db.collection<EntraIDConfig>('entraid_configs').updateOne(
					{ organizationId },
					{
						$set: configData,
					}
				);
			} else {
				// Create new
				await db.collection<EntraIDConfig>('entraid_configs').insertOne({
					...configData,
					createdAt: new Date(),
					createdBy: locals.user?.id || 'system',
				} as EntraIDConfig);
			}

			return {
				success: true,
				message: testResult.success
					? 'Configuration saved and connection successful!'
					: 'Configuration saved but connection failed. Please check your credentials.',
				connectionStatus: testResult.success ? 'connected' : 'failed',
			};
		} catch (error: any) {
			console.error('Save config error:', error);
			return fail(500, {
				error: error.message || 'Failed to save configuration',
			});
		}
	},

	/**
	 * Update field mapping
	 */
	updateFieldMapping: async ({ request }) => {
		try {
			const db = getDB();
			const formData = await request.formData();

			const organizationId = formData.get('organizationId')?.toString();
			const fieldMappingJson = formData.get('fieldMapping')?.toString();

			if (!organizationId || !fieldMappingJson) {
				return fail(400, {
					error: 'Missing required fields',
				});
			}

			const fieldMapping = JSON.parse(fieldMappingJson);

			// Update field mapping
			await db.collection<EntraIDConfig>('entraid_configs').updateOne(
				{ organizationId },
				{
					$set: {
						fieldMapping,
						updatedAt: new Date(),
					},
				}
			);

			return {
				success: true,
				message: 'Field mapping updated successfully!',
			};
		} catch (error: any) {
			console.error('Update field mapping error:', error);
			return fail(500, {
				error: error.message || 'Failed to update field mapping',
			});
		}
	},

	/**
	 * Trigger manual sync
	 */
	syncNow: async ({ request }) => {
		try {
			const db = getDB();
			const formData = await request.formData();

			const organizationId = formData.get('organizationId')?.toString();

			if (!organizationId) {
				return fail(400, {
					error: 'Missing organization ID',
				});
			}

			// Get config
			const config = await db.collection<EntraIDConfig>('entraid_configs').findOne({
				organizationId,
			});

			if (!config) {
				return fail(400, {
					error: 'EntraID configuration not found. Please configure first.',
				});
			}

			if (!config.isConnected) {
				return fail(400, {
					error: 'Not connected to EntraID. Please test connection first.',
				});
			}

			// TODO: Implement actual sync logic here
			// For now, just create a log entry
			const syncId = `sync-${Date.now()}`;

			await db.collection('entraid_sync_logs').insertOne({
				syncId,
				organizationId,
				type: 'full',
				status: 'pending',
				startedAt: new Date(),
				totalRecords: 0,
				successCount: 0,
				failureCount: 0,
				errors: [],
				triggeredBy: 'manual',
				createdAt: new Date(),
			});

			return {
				success: true,
				message: 'Sync initiated! Check sync history for progress.',
				syncId,
			};
		} catch (error: any) {
			console.error('Sync now error:', error);
			return fail(500, {
				error: error.message || 'Failed to initiate sync',
			});
		}
	},
};
