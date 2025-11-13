import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';

/**
 * GET /api/settings
 * Get all system settings
 */
export const GET: RequestHandler = async () => {
	const db = getDB();
	const settings = await db.collection('system_settings').find({}).toArray();

	// If no settings exist, return defaults
	if (settings.length === 0) {
		return json(getDefaultSettings());
	}

	return json(
		settings.map((s) => ({
			...s,
			_id: s._id.toString()
		}))
	);
};

/**
 * PUT /api/settings
 * Update multiple settings
 */
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const db = getDB();
		const data = await request.json();
		const updates = data.settings as Array<{ key: string; value: any }>;

		if (!Array.isArray(updates) || updates.length === 0) {
			return json({ error: 'Settings array is required' }, { status: 400 });
		}

		// Update each setting
		const bulkOps = updates.map((setting) => ({
			updateOne: {
				filter: { key: setting.key },
				update: {
					$set: {
						value: setting.value,
						updatedAt: new Date(),
						updatedBy: data.updatedBy || 'system'
					}
				},
				upsert: true
			}
		}));

		await db.collection('system_settings').bulkWrite(bulkOps);

		return json({ success: true, message: 'Settings updated successfully' });
	} catch (error: any) {
		console.error('Error updating settings:', error);
		return json({ error: error.message || 'Failed to update settings' }, { status: 500 });
	}
};

/**
 * POST /api/settings/init
 * Initialize default settings (for first time setup)
 */
export const POST: RequestHandler = async () => {
	try {
		const db = getDB();

		// Check if settings already exist
		const count = await db.collection('system_settings').countDocuments();
		if (count > 0) {
			return json({ message: 'Settings already initialized' });
		}

		// Insert default settings
		const defaults = getDefaultSettings();
		await db.collection('system_settings').insertMany(defaults);

		return json({ success: true, message: 'Default settings initialized' });
	} catch (error: any) {
		console.error('Error initializing settings:', error);
		return json({ error: error.message || 'Failed to initialize settings' }, { status: 500 });
	}
};

/**
 * Default system settings
 */
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
			description: 'Require email verification for new accounts',
			updatedAt: new Date()
		}
	];
}
