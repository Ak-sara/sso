import { getDB } from '$lib/db/connection';
import type { MaskingConfig } from './data-masking';
import { getDefaultMaskingConfig } from './data-masking';

/**
 * Load masking configuration from database
 * Returns default config if not found or if error occurs
 */
export async function getMaskingConfig(): Promise<MaskingConfig> {
	try {
		const db = getDB();
		const setting = await db.collection('system_settings').findOne({
			key: 'data_masking_config'
		});

		if (!setting || !setting.value) {
			return getDefaultMaskingConfig();
		}

		return setting.value as MaskingConfig;
	} catch (error) {
		console.error('Error loading masking config:', error);
		return getDefaultMaskingConfig();
	}
}
