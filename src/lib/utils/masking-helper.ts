import { db } from '$lib/db/db';
import { useLogger } from '@ak-sara/fbao/foundation';
import type { MaskingConfig } from './data-masking';
import { getDefaultMaskingConfig } from './data-masking';

const log = useLogger({ module: 'utils:masking' });

/**
 * Load masking configuration from database
 * Returns default config if not found or if error occurs
 */
export async function getMaskingConfig(): Promise<MaskingConfig> {
	try {
		const setting = await db.systemSettings.findOne({ key: 'data_masking_config' });
		if (!setting?.value) return getDefaultMaskingConfig();
		return setting.value as unknown as MaskingConfig;
	} catch (error) {
		log.error('Error loading masking config', { error });
		return getDefaultMaskingConfig();
	}
}
