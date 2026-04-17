import { useLogger } from '@ak-sara/fbao/foundation';
import { db } from '$lib/db/db';
import type { SystemSettings } from '$lib/db/schemas/system-settings';

const log = useLogger({ module: 'service:settings' });

export const DEFAULT_SETTINGS: Omit<SystemSettings, '_id'>[] = [
	{ key: 'token_expiration', value: 3600, type: 'duration', category: 'security', label: 'Token Expiration', description: 'Access token expiration time', unit: 'seconds', updatedAt: new Date() },
	{ key: 'refresh_token_expiration', value: 2592000, type: 'duration', category: 'security', label: 'Refresh Token Expiration', description: 'Refresh token expiration time', unit: 'seconds', updatedAt: new Date() },
	{ key: 'session_timeout', value: 604800, type: 'duration', category: 'security', label: 'Session Timeout', description: 'Idle session timeout', unit: 'seconds', updatedAt: new Date() },
	{ key: 'password_min_length', value: 8, type: 'number', category: 'security', label: 'Password Min Length', description: 'Minimum password length', unit: 'characters', updatedAt: new Date() },
	{ key: 'enable_registration', value: false, type: 'boolean', category: 'general', label: 'Enable Self Registration', description: 'Allow users to self-register', updatedAt: new Date() },
	{ key: 'enable_email_verification', value: true, type: 'boolean', category: 'security', label: 'Email Verification Required', description: 'Require email verification for new accounts.', updatedAt: new Date() },
	{ key: 'data_masking_config', value: { enabled: true, rules: [{ field: 'email', type: 'email' }, { field: 'phone', type: 'phone', showFirst: 4, showLast: 4 }], exemptRoles: ['admin', 'superadmin'] }, type: 'json', category: 'privacy', label: 'Data Masking Configuration', description: 'Configure field masking for UU PDP compliance.', updatedAt: new Date() },
	{ key: 'email_service_provider', value: 'nodemailer', type: 'string', category: 'email', label: 'Email Service Provider', description: 'Choose email provider', updatedAt: new Date() },
	{ key: 'email_service_config', value: { nodemailer: { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: '' }, gmail: { user: '', appPassword: '', fromName: '' }, microsoft365: { user: '', appPassword: '', fromName: '' }, sendgrid: { apiKey: '', fromEmail: '', fromName: '' }, resend: { apiKey: '', fromEmail: '', fromName: '' }, microsoft_graph: { tenantId: '', clientId: '', clientSecret: '', fromEmail: '', fromName: '' } }, type: 'json', category: 'email', label: 'Email Service Configuration', description: 'Configuration for selected email provider', updatedAt: new Date() },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function parseSettingValue(value: unknown, type: SystemSettings['type']): unknown {
	if (type === 'number' || type === 'duration') return parseInt(value as string);
	if (type === 'boolean') return value === 'true' || value === 'on';
	if (type === 'json') { try { return JSON.parse(value as string); } catch { return value; } }
	return value;
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<SystemSettings[]> {
	let settings = await db.systemSettings.find();

	if (settings.length === 0) {
		await db.systemSettings.col.insertMany(DEFAULT_SETTINGS);
		settings = await db.systemSettings.find();
	} else {
		const existingKeys = new Set(settings.map((s: any) => s.key));
		const missing = DEFAULT_SETTINGS.filter((d) => !existingKeys.has(d.key));
		if (missing.length > 0) {
			await db.systemSettings.col.insertMany(missing);
			settings = await db.systemSettings.find();
		}
	}

	return settings as SystemSettings[];
}

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
	const doc = await db.systemSettings.findOne({ key } as any);
	return doc?.value as T | undefined;
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function updateSettingsFromForm(
	formData: Record<string, unknown>,
	updatedBy = 'admin'
): Promise<void> {
	// Detect boolean settings that may be absent when unchecked
	const booleanKeys = new Set<string>();
	for (const [key, value] of Object.entries(formData)) {
		if (key.endsWith('_type') && value === 'boolean') {
			booleanKeys.add(key.replace('setting_', '').replace('_type', ''));
		}
	}

	const updates: Array<{ key: string; value: unknown }> = [];
	for (const [key, value] of Object.entries(formData)) {
		if (!key.startsWith('setting_') || key.endsWith('_type')) continue;
		const settingKey = key.replace('setting_', '');
		const setting = await db.systemSettings.findOne({ key: settingKey } as any);
		updates.push({ key: settingKey, value: setting ? parseSettingValue(value, setting.type) : value });
	}

	// Unchecked booleans don't appear in form data — default to false
	for (const boolKey of booleanKeys) {
		if (!updates.some((u) => u.key === boolKey)) updates.push({ key: boolKey, value: false });
	}

	if (updates.length === 0) return;

	try {
		await db.systemSettings.bulkWrite(
			updates.map((u) => ({
				updateOne: {
					filter: { key: u.key },
					update: { $set: { value: u.value, updatedAt: new Date(), updatedBy } },
				},
			}))
		);
	} catch (err) {
		log.error('Failed to bulk-update settings', { error: err });
		throw err;
	}
}
