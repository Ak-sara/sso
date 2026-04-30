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

export interface EmailFrom { fromName?: string; fromEmail?: string; }
export interface EmailSystemConfig {
	provider: string;
	config: Record<string, unknown>;
	from?: EmailFrom;
}

async function getEmailSystemConfig(): Promise<EmailSystemConfig> {
	const [provider, fullConfig] = await Promise.all([
		getSetting<string>('email_service_provider'),
		getSetting<Record<string, Record<string, unknown>>>('email_service_config')
	]);
	if (!provider || !fullConfig) throw new Error('Email service not configured');
	return { provider, config: fullConfig[provider] ?? {} };
}

export async function resolveRealmCode(orgId: string | undefined): Promise<string | undefined> {
	if (!orgId) return undefined;
	try {
		const { ObjectId } = await import('mongodb');
		const org = await db.organizations.findOne({ _id: new ObjectId(orgId) } as any);
		return (org as any)?.code ?? undefined;
	} catch {
		return undefined;
	}
}

export async function getEmailConfig(realmCode: string | undefined): Promise<EmailSystemConfig> {
	if (!realmCode) { // log.info('Email config resolved', { source: 'system' });
		return getEmailSystemConfig();
	}

	const code = realmCode.toUpperCase();
	const realm = await db.organizations.findOne({ code } as any);
	const transport: { provider?: string; [key: string]: any } | undefined =
		realm?.emailTransport?.provider ? realm.emailTransport : undefined;

	// if (transport) log.info('Email config resolved', { source: `realm(${code})`, provider: transport.provider });
	// else log.info('Email config resolved', { source: 'system', realmCode: code });

	const resolved: EmailSystemConfig = transport
		? { provider: transport.provider!, config: transport[transport.provider!] ?? {} }
		: await getEmailSystemConfig();

	const branding = realm?.branding as { emailFromName?: string; emailFromAddress?: string } | undefined;
	if (branding?.emailFromName || branding?.emailFromAddress) {
		resolved.from = { fromName: branding.emailFromName, fromEmail: branding.emailFromAddress };
	}
	return resolved;
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function updateSetting(key: string, value: unknown, updatedBy = 'admin'): Promise<void> {
	await db.systemSettings.col.updateOne(
		{ key } as any,
		{ $set: { value, updatedAt: new Date(), updatedBy } as any }
	);
}

export async function updateEmailProvider(provider: string, providerConfig: Record<string, unknown>): Promise<void> {
	const existing = (await getSetting<Record<string, any>>('email_service_config')) ?? {};
	const merged = { ...existing, [provider]: { ...(existing[provider] ?? {}), ...providerConfig } };
	await Promise.all([
		updateSetting('email_service_provider', provider),
		updateSetting('email_service_config', merged)
	]);
}

export async function getMaskingConfig(): Promise<Record<string, unknown>> {
	const setting = await db.systemSettings.findOne({ key: 'data_masking_config' } as any);
	if (!setting) {
		const { getDefaultMaskingConfig } = await import('$lib/utils/data-masking');
		const config = getDefaultMaskingConfig();
		await updateSetting('data_masking_config', config);
		return config;
	}
	return setting.value as Record<string, unknown>;
}

export async function updateMaskingConfig(config: Record<string, unknown>): Promise<void> {
	await updateSetting('data_masking_config', config);
}

export async function updateSettings(formData: Record<string, unknown>, updatedBy = 'admin'): Promise<void> {
	const booleanKeys = new Set<string>();
	for (const [key, value] of Object.entries(formData)) {
		if (key.endsWith('_type') && value === 'boolean')
			booleanKeys.add(key.replace('setting_', '').replace('_type', ''));
	}

	const updates: Array<{ key: string; value: unknown }> = [];
	for (const [key, value] of Object.entries(formData)) {
		if (!key.startsWith('setting_') || key.endsWith('_type')) continue;
		const settingKey = key.replace('setting_', '');
		const setting = await db.systemSettings.findOne({ key: settingKey } as any);
		updates.push({ key: settingKey, value: setting ? parseSettingValue(value, setting.type) : value });
	}

	for (const boolKey of booleanKeys) {
		if (!updates.some((u) => u.key === boolKey)) updates.push({ key: boolKey, value: false });
	}

	if (updates.length === 0) return;

	try {
		await Promise.all(updates.map((u) => updateSetting(u.key, u.value, updatedBy)));
	} catch (err) {
		log.error('Failed to update settings', { error: err });
		throw err;
	}
}
