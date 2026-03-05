import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail } from '@sveltejs/kit';
import { getDefaultMaskingConfig } from '$lib/utils/data-masking';

export const load: PageServerLoad = async () => {
	const db = getDB();

	// Get masking configuration
	let maskingSetting = await db.collection('system_settings').findOne({
		key: 'data_masking_config'
	});

	// If not found, initialize with default
	if (!maskingSetting) {
		const defaultConfig = getDefaultMaskingConfig();
		await db.collection('system_settings').insertOne({
			key: 'data_masking_config',
			value: defaultConfig,
			type: 'json',
			category: 'privacy',
			label: 'Data Masking Configuration',
			description: 'Configure which fields should be masked for UU PDP compliance.',
			updatedAt: new Date()
		});

		maskingSetting = await db.collection('system_settings').findOne({
			key: 'data_masking_config'
		});
	}

	return {
		config: maskingSetting?.value || getDefaultMaskingConfig()
	};
};

export const actions: Actions = {
	update: async ({ request }) => {
		const formData = await request.formData();
		const db = getDB();

		try {
			const enabled = formData.get('enabled') === 'true';
			const rulesJson = formData.get('rules') as string;
			const exemptRolesStr = formData.get('exemptRoles') as string;

			// Parse rules
			let rules;
			try {
				rules = JSON.parse(rulesJson);
			} catch (e) {
				return fail(400, { error: 'Invalid rules JSON format' });
			}

			// Parse exempt roles
			const exemptRoles = exemptRolesStr
				.split(',')
				.map((r) => r.trim())
				.filter((r) => r.length > 0);

			const config = {
				enabled,
				rules,
				exemptRoles
			};

			// Update setting
			await db.collection('system_settings').updateOne(
				{ key: 'data_masking_config' },
				{
					$set: {
						value: config,
						updatedAt: new Date(),
						updatedBy: 'admin' // TODO: Get from session
					}
				},
				{ upsert: true }
			);

			return { success: 'Data masking configuration updated successfully' };
		} catch (error: any) {
			console.error('Error updating data masking config:', error);
			return fail(500, { error: error.message || 'Failed to update configuration' });
		}
	},

	addRule: async ({ request }) => {
		const formData = await request.formData();
		const db = getDB();

		try {
			const field = formData.get('field') as string;
			const type = formData.get('type') as string;
			const showFirst = formData.get('showFirst') ? parseInt(formData.get('showFirst') as string) : undefined;
			const showLast = formData.get('showLast') ? parseInt(formData.get('showLast') as string) : undefined;
			const maskChar = (formData.get('maskChar') as string) || '*';

			const newRule: any = { field, type };
			if (showFirst !== undefined) newRule.showFirst = showFirst;
			if (showLast !== undefined) newRule.showLast = showLast;
			if (maskChar !== '*') newRule.maskChar = maskChar;

			// Get current config
			const setting = await db.collection('system_settings').findOne({
				key: 'data_masking_config'
			});

			if (!setting) {
				return fail(404, { error: 'Masking configuration not found' });
			}

			const config = setting.value;
			config.rules.push(newRule);

			// Update
			await db.collection('system_settings').updateOne(
				{ key: 'data_masking_config' },
				{
					$set: {
						value: config,
						updatedAt: new Date()
					}
				}
			);

			return { success: 'Rule added successfully' };
		} catch (error: any) {
			console.error('Error adding rule:', error);
			return fail(500, { error: error.message || 'Failed to add rule' });
		}
	},

	deleteRule: async ({ request }) => {
		const formData = await request.formData();
		const db = getDB();

		try {
			const ruleIndex = parseInt(formData.get('index') as string);

			// Get current config
			const setting = await db.collection('system_settings').findOne({
				key: 'data_masking_config'
			});

			if (!setting) {
				return fail(404, { error: 'Masking configuration not found' });
			}

			const config = setting.value;
			config.rules.splice(ruleIndex, 1);

			// Update
			await db.collection('system_settings').updateOne(
				{ key: 'data_masking_config' },
				{
					$set: {
						value: config,
						updatedAt: new Date()
					}
				}
			);

			return { success: 'Rule deleted successfully' };
		} catch (error: any) {
			console.error('Error deleting rule:', error);
			return fail(500, { error: error.message || 'Failed to delete rule' });
		}
	}
};
