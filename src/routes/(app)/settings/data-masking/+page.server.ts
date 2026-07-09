import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getMaskingConfig } from '$lib/utils/masking-helper';
import { updateMaskingConfig } from '$lib/services/settings-service';
import { useLogger } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'app:data-masking' });

export const load: PageServerLoad = async () => {
	return { config: await getMaskingConfig() };
};

export const actions: Actions = {
	update: async ({ locals }) => {
		try {
			const { enabled, rules: rulesJson, exemptRoles: exemptRolesStr } = locals.body as any;
			let rules;
			try { rules = JSON.parse(rulesJson); }
			catch { return fail(400, { error: 'Invalid rules JSON format' }); }
			const exemptRoles = (exemptRolesStr as string).split(',').map((r) => r.trim()).filter(Boolean);
			await updateMaskingConfig({ enabled: enabled === 'true', rules, exemptRoles });
			return { success: 'Data masking configuration updated successfully' };
		} catch (err: any) {
			log.error('Error updating data masking config', { error: err });
			return fail(500, { error: err.message || 'Failed to update configuration' });
		}
	},

	addRule: async ({ locals }) => {
		try {
			const { field, type, showFirst, showLast, maskChar } = locals.body as any;
			const newRule: any = { field, type };
			if (showFirst) newRule.showFirst = parseInt(showFirst);
			if (showLast) newRule.showLast = parseInt(showLast);
			if (maskChar && maskChar !== '*') newRule.maskChar = maskChar;

			const config = await getMaskingConfig();
			config.rules.push(newRule);
			await updateMaskingConfig(config);
			return { success: 'Rule added successfully' };
		} catch (err: any) {
			log.error('Error adding masking rule', { error: err });
			return fail(500, { error: err.message || 'Failed to add rule' });
		}
	},

	deleteRule: async ({ locals }) => {
		try {
			const ruleIndex = parseInt((locals.body as any).index);
			const config = await getMaskingConfig();
			config.rules.splice(ruleIndex, 1);
			await updateMaskingConfig(config);
			return { success: 'Rule deleted successfully' };
		} catch (err: any) {
			log.error('Error deleting masking rule', { error: err });
			return fail(500, { error: err.message || 'Failed to delete rule' });
		}
	}
};
