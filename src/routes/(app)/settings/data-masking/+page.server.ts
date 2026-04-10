import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { fail } from '@sveltejs/kit';
import { getDefaultMaskingConfig } from '$lib/utils/data-masking';
import { useLogger } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'app:data-masking' });

export const load: PageServerLoad = async () => {
	// Get masking configuration
	let maskingSetting = await db.systemSettings.findOne({
		key: 'data_masking_config'
	});

	// If not found, initialize with default
	if (!maskingSetting) {
		const defaultConfig = getDefaultMaskingConfig();
		await db.systemSettings.insertOne({
			key: 'data_masking_config',
			value: defaultConfig,
			type: 'json',
			category: 'privacy',
			label: 'Data Masking Configuration',
			description: 'Configure which fields should be masked for UU PDP compliance.',
			updatedAt: new Date()
		} as any);

		maskingSetting = await db.systemSettings.findOne({
			key: 'data_masking_config'
		});
	}

	return {
		config: maskingSetting?.value || getDefaultMaskingConfig()
	};
};

export const actions: Actions = {
	update: async ({ locals }) => {
		const formData = locals.body

		try {
			const enabled = formData?.enabled === 'true';
			const rulesJson = formData?.rules;
			const exemptRolesStr = formData?.exemptRoles;

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
				.map((r:string) => r.trim())
				.filter((r:string) => r.length > 0);

			const config = {
				enabled,
				rules,
				exemptRoles
			};

			// Update setting (upsert)
			await db.systemSettings.upsertOne(
				{ key: 'data_masking_config' },
				{
					value: config,
					updatedAt: new Date(),
					updatedBy: 'admin' // TODO: Get from session
				} as any
			);

			return { success: 'Data masking configuration updated successfully' };
		} catch (error: any) {
			log.error('Error updating data masking config', { error });
			return fail(500, { error: error.message || 'Failed to update configuration' });
		}
	},

	addRule: async ({ locals }) => {
		const formData = locals.body

		try {
			const field = formData?.field;
			const type = formData?.type;
			const showFirst = formData?.showFirst ? parseInt(formData?.showFirst) : undefined;
			const showLast = formData?.showLast ? parseInt(formData?.showLast) : undefined;
			const maskChar = formData?.maskChar || '*';

			const newRule: any = { field, type };
			if (showFirst !== undefined) newRule.showFirst = showFirst;
			if (showLast !== undefined) newRule.showLast = showLast;
			if (maskChar !== '*') newRule.maskChar = maskChar;

			// Get current config
			const setting = await db.systemSettings.findOne({
				key: 'data_masking_config'
			});

			if (!setting) {
				return fail(404, { error: 'Masking configuration not found' });
			}

			const config = setting.value as { rules: any[]; [k: string]: unknown };
			config.rules.push(newRule);

			// Update
			await db.systemSettings.updateOne(
				{ key: 'data_masking_config' },
				{
					value: config,
					updatedAt: new Date()
				}
			);

			return { success: 'Rule added successfully' };
		} catch (error: any) {
			log.error('Error adding rule', { error });
			return fail(500, { error: error.message || 'Failed to add rule' });
		}
	},

	deleteRule: async ({ locals }) => {
		const formData = locals.body

		try {
			const ruleIndex = parseInt(formData?.index);

			// Get current config
			const setting = await db.systemSettings.findOne({
				key: 'data_masking_config'
			});

			if (!setting) {
				return fail(404, { error: 'Masking configuration not found' });
			}

			const config = setting.value as { rules: any[]; [k: string]: unknown };
			config.rules.splice(ruleIndex, 1);

			// Update
			await db.systemSettings.updateOne(
				{ key: 'data_masking_config' },
				{
					value: config,
					updatedAt: new Date()
				}
			);

			return { success: 'Rule deleted successfully' };
		} catch (error: any) {
			log.error('Error deleting rule', { error });
			return fail(500, { error: error.message || 'Failed to delete rule' });
		}
	}
};
