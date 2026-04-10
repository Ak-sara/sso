import { sendEmail } from '@ak-sara/fbao/foundation';
import { getDB } from '$lib/db/connection';

export { sendEmail };

/**
 * Load email configuration from database
 */
export async function getEmailConfig() {
	const db = getDB();

	const providerSetting = await db
		.collection('system_settings')
		.findOne({ key: 'email_service_provider' });

	const configSetting = await db
		.collection('system_settings')
		.findOne({ key: 'email_service_config' });

	if (!providerSetting || !configSetting) {
		throw new Error('Email service not configured');
	}

	return {
		provider: providerSetting.value as string,
		config: configSetting.value[providerSetting.value as keyof typeof configSetting.value]
	};
}

/**
 * Send email using stored database configuration
 */
export async function sendEmailWithSystemConfig(
	to: string,
	subject: string,
	html: string,
	text?: string
) {
	const { provider, config } = await getEmailConfig();

	return sendEmail({
		provider,
		config,
		to,
		subject,
		html,
		text
	});
}
