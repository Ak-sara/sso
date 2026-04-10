import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';

function getDefaultSettings() {
	return [
		{ key: 'token_expiration', value: 3600, type: 'duration', category: 'security', label: 'Token Expiration', description: 'Access token expiration time', unit: 'seconds', updatedAt: new Date() },
		{ key: 'refresh_token_expiration', value: 2592000, type: 'duration', category: 'security', label: 'Refresh Token Expiration', description: 'Refresh token expiration time', unit: 'seconds', updatedAt: new Date() },
		{ key: 'session_timeout', value: 604800, type: 'duration', category: 'security', label: 'Session Timeout', description: 'Idle session timeout', unit: 'seconds', updatedAt: new Date() },
		{ key: 'password_min_length', value: 8, type: 'number', category: 'security', label: 'Password Min Length', description: 'Minimum password length', unit: 'characters', updatedAt: new Date() },
		{ key: 'enable_registration', value: false, type: 'boolean', category: 'general', label: 'Enable Self Registration', description: 'Allow users to self-register', updatedAt: new Date() },
		{ key: 'enable_email_verification', value: true, type: 'boolean', category: 'security', label: 'Email Verification Required', description: 'Require email verification for new accounts.', updatedAt: new Date() },
		{
			key: 'data_masking_config',
			value: { enabled: true, rules: [{ field: 'email', type: 'email' }, { field: 'phone', type: 'phone', showFirst: 4, showLast: 4 }, { field: 'customProperties.ktp', type: 'ktp', showFirst: 4, showLast: 4 }, { field: 'customProperties.dob', type: 'date' }], exemptRoles: ['admin', 'superadmin'] },
			type: 'json', category: 'privacy', label: 'Data Masking Configuration', description: 'Configure which fields should be masked for UU PDP compliance.', updatedAt: new Date()
		}
	];
}

// GET /api/settings
export const GET: RequestHandler = async () => {
	let settings = await db.systemSettings.find();
	if (settings.length === 0) {
		await db.systemSettings.col.insertMany(getDefaultSettings() as any);
		settings = await db.systemSettings.find();
	} else {
		const defaults = getDefaultSettings();
		const existingKeys = new Set(settings.map((s: any) => s.key));
		const missing = defaults.filter((d) => !existingKeys.has(d.key));
		if (missing.length > 0) {
			await db.systemSettings.col.insertMany(missing as any);
			settings = await db.systemSettings.find();
		}
	}
	return json(settings.map((s: any) => ({ ...s, _id: s._id.toString() })));
};

// PUT /api/settings
export const PUT: RequestHandler = async ({ locals }) => {
	try {
		const data = locals.body
		const updates = data?.settings as Array<{ key: string; value: any }>;
		if (!Array.isArray(updates) || updates.length === 0) return json({ error: 'Settings array is required' }, { status: 400 });

		await db.systemSettings.bulkWrite(updates.map((s) => ({
			updateOne: {
				filter: { key: s.key },
				update: { $set: { value: s.value, updatedAt: new Date(), updatedBy: data?.updatedBy || 'system' } },
				upsert: true
			}
		})));
		return json({ success: true, message: 'Settings updated successfully' });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update settings' }, { status: 500 });
	}
};

// POST /api/settings - init defaults
export const POST: RequestHandler = async () => {
	try {
		const count = await db.systemSettings.count();
		if (count > 0) return json({ message: 'Settings already initialized' });
		await db.systemSettings.col.insertMany(getDefaultSettings() as any);
		return json({ success: true, message: 'Default settings initialized' });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to initialize settings' }, { status: 500 });
	}
};
