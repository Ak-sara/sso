import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const db = getDB();

	// Get all organizations as realms
	const organizations = await db.collection('organizations').find({}).sort({ name: 1 }).toArray();

	// Get system settings
	let settings = await db.collection('system_settings').find({}).toArray();

	// Initialize default settings if none exist
	if (settings.length === 0) {
		const defaults = getDefaultSettings();
		await db.collection('system_settings').insertMany(defaults);
		settings = defaults;
	} else {
		// Check for missing settings and add them
		const defaults = getDefaultSettings();
		const existingKeys = new Set(settings.map(s => s.key));
		const missingSettings = defaults.filter(d => !existingKeys.has(d.key));

		if (missingSettings.length > 0) {
			console.log('🔧 Adding missing settings:', missingSettings.map(s => s.key));
			await db.collection('system_settings').insertMany(missingSettings);
			// Reload settings
			settings = await db.collection('system_settings').find({}).toArray();
		}
	}

	return {
		realms: organizations.map((org) => ({
			...org,
			_id: org._id.toString(),
			parentId: org.parentId?.toString() || null
		})),
		settings: settings.map((s) => ({
			...s,
			_id: s._id?.toString()
		}))
	};
};

export const actions: Actions = {
	update: async ({ request }) => {
		const formData = await request.formData();
		const db = getDB();

		try {
			// First, collect all boolean setting keys from the _type markers
			const booleanSettings = new Set<string>();
			for (const [key, value] of formData.entries()) {
				if (key.endsWith('_type') && value === 'boolean') {
					const settingKey = key.replace('setting_', '').replace('_type', '');
					booleanSettings.add(settingKey);
				}
			}

			// Parse all settings from form data
			const updates: Array<{ key: string; value: any }> = [];

			for (const [key, value] of formData.entries()) {
				if (key.startsWith('setting_') && !key.endsWith('_type')) {
					const settingKey = key.replace('setting_', '');

					// Get the setting type to properly cast the value
					const setting = await db.collection('system_settings').findOne({ key: settingKey });

					let parsedValue: any = value;
					if (setting) {
						if (setting.type === 'number' || setting.type === 'duration') {
							parsedValue = parseInt(value as string);
						} else if (setting.type === 'boolean') {
							parsedValue = value === 'true' || value === 'on';
						} else if (setting.type === 'json') {
							try {
								parsedValue = JSON.parse(value as string);
							} catch {
								parsedValue = value;
							}
						}
					}

					updates.push({ key: settingKey, value: parsedValue });
				}
			}

			// Handle unchecked boolean checkboxes (they don't appear in formData)
			for (const booleanKey of booleanSettings) {
				const alreadyInUpdates = updates.some(u => u.key === booleanKey);
				if (!alreadyInUpdates) {
					// Checkbox was unchecked, set to false
					updates.push({ key: booleanKey, value: false });
				}
			}

			// Update each setting
			for (const update of updates) {
				await db.collection('system_settings').updateOne(
					{ key: update.key },
					{
						$set: {
							value: update.value,
							updatedAt: new Date(),
							updatedBy: 'admin' // TODO: Get from session
						}
					}
				);
			}

			return { success: 'Settings updated successfully' };
		} catch (error: any) {
			console.error('Error updating settings:', error);
			return fail(500, { error: error.message || 'Failed to update settings' });
		}
	}
};

function getDefaultSettings() {
	return [
		{
			key: 'token_expiration',
			value: 3600,
			type: 'duration',
			category: 'security',
			label: 'Token Expiration',
			description: 'Access token expiration time',
			unit: 'seconds',
			updatedAt: new Date()
		},
		{
			key: 'refresh_token_expiration',
			value: 2592000,
			type: 'duration',
			category: 'security',
			label: 'Refresh Token Expiration',
			description: 'Refresh token expiration time',
			unit: 'seconds',
			updatedAt: new Date()
		},
		{
			key: 'session_timeout',
			value: 604800,
			type: 'duration',
			category: 'security',
			label: 'Session Timeout',
			description: 'Idle session timeout',
			unit: 'seconds',
			updatedAt: new Date()
		},
		{
			key: 'password_min_length',
			value: 8,
			type: 'number',
			category: 'security',
			label: 'Password Min Length',
			description: 'Minimum password length',
			unit: 'characters',
			updatedAt: new Date()
		},
		{
			key: 'enable_registration',
			value: false,
			type: 'boolean',
			category: 'general',
			label: 'Enable Self Registration',
			description: 'Allow users to self-register',
			updatedAt: new Date()
		},
		{
			key: 'enable_email_verification',
			value: true,
			type: 'boolean',
			category: 'security',
			label: 'Email Verification Required',
			description: 'Require email verification for new accounts. When enabled, also enforces per-realm email domain whitelisting.',
			updatedAt: new Date()
		},
		{
			key: 'data_masking_config',
			value: {
				enabled: true,
				rules: [
					{ field: 'email', type: 'email' },
					{ field: 'phone', type: 'phone', showFirst: 4, showLast: 4 },
					{ field: 'customProperties.ktp', type: 'ktp', showFirst: 4, showLast: 4 },
					{ field: 'customProperties.dob', type: 'date' }
				],
				exemptRoles: ['admin', 'superadmin']
			},
			type: 'json',
			category: 'privacy',
			label: 'Data Masking Configuration',
			description: 'Configure which fields should be masked for UU PDP compliance. Admins can see unmasked data.',
			updatedAt: new Date()
		},
		{
			key: 'email_service_provider',
			value: 'nodemailer',
			type: 'string',
			category: 'email',
			label: 'Email Service Provider',
			description: 'Choose email provider: gmail, microsoft365, sendgrid, or nodemailer (generic SMTP)',
			updatedAt: new Date()
		},
		{
			key: 'email_service_config',
			value: {
				// Gmail fields
				gmail: {
					user: '',
					appPassword: '',
					fromName: ''
				},
				// Microsoft365 fields
				microsoft365: {
					user: '',
					appPassword: '',
					fromName: ''
				},
				// SendGrid fields
				sendgrid: {
					apiKey: '',
					fromEmail: '',
					fromName: ''
				},
				// Generic SMTP (like PHPMailer)
				nodemailer: {
					host: '',
					port: 587,
					secure: false,
					user: '',
					password: '',
					fromEmail: '',
					fromName: ''
				}
			},
			type: 'json',
			category: 'email',
			label: 'Email Service Configuration',
			description: 'Configuration for selected email provider',
			updatedAt: new Date()
		}
	];
}
