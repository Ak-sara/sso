import { sendEmail } from '@ak-sara/fbao/foundation';
import { getDB } from '$lib/db/connection';
import { useLogger } from '@ak-sara/fbao/foundation';

export { sendEmail };

const log = useLogger({ module: 'email:service' });

export interface EmailFrom { fromName?: string; fromEmail?: string; }

export interface ResolvedEmailConfig {
	provider: string;
	config: Record<string, unknown>;
	from?: EmailFrom;
}

// ── Provider implementations ───────────────────────────────────────────────

export async function sendViaResend(config: any, to: string, subject: string, html: string, text?: string, from?: EmailFrom) {
	const fromEmail = from?.fromEmail || config.fromEmail;
	const fromName  = from?.fromName  || config.fromName;
	const fromStr   = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ from: fromStr, to: [to], subject, html, ...(text ? { text } : {}) })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(`Resend ${res.status}: ${(err as any).message ?? res.statusText}`);
	}
}

export async function sendViaMicrosoftGraph(config: any, to: string, subject: string, html: string, text?: string, from?: EmailFrom) {
	const tokenRes = await fetch(
		`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: config.clientId, client_secret: config.clientSecret,
				scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials'
			})
		}
	);
	if (!tokenRes.ok) {
		const err = await tokenRes.json().catch(() => ({}));
		throw new Error(`Graph token ${tokenRes.status}: ${(err as any).error_description ?? tokenRes.statusText}`);
	}
	const { access_token } = await tokenRes.json();

	const fromEmail = from?.fromEmail || config.fromEmail;
	const fromName  = from?.fromName  || config.fromName;

	const mailRes = await fetch(`https://graph.microsoft.com/v1.0/users/${config.fromEmail}/sendMail`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			message: {
				subject,
				body: { contentType: 'HTML', content: html },
				toRecipients: [{ emailAddress: { address: to } }],
				from: { emailAddress: { address: fromEmail, name: fromName ?? '' } }
			},
			saveToSentItems: false
		})
	});
	if (!mailRes.ok && mailRes.status !== 202) {
		const err = await mailRes.json().catch(() => ({}));
		throw new Error(`Graph send ${mailRes.status}: ${JSON.stringify((err as any).error ?? mailRes.statusText)}`);
	}
}

// ── Config resolution ──────────────────────────────────────────────────────

/** Load global transport from system_settings */
export async function getGlobalEmailConfig(): Promise<ResolvedEmailConfig> {
	const db = getDB();
	const [providerDoc, configDoc] = await Promise.all([
		db.collection('system_settings').findOne({ key: 'email_service_provider' }),
		db.collection('system_settings').findOne({ key: 'email_service_config' })
	]);
	if (!providerDoc || !configDoc) throw new Error('Email service not configured');
	const provider = providerDoc.value as string;
	return { provider, config: configDoc.value[provider] ?? {} };
}

/**
 * Resolve email config for a realm.
 * Priority: realm.emailTransport → MASTER.emailTransport → system_settings
 * The from name/address is always taken from realm.branding if set.
 */
export async function getEmailConfigForRealm(realmCode: string): Promise<ResolvedEmailConfig> {
	const db = getDB();
	const code = realmCode.toUpperCase();

	const [realm, master] = await Promise.all([
		code !== 'MASTER' ? db.collection('organizations').findOne({ code }) : Promise.resolve(null),
		db.collection('organizations').findOne({ code: 'MASTER' })
	]);

	// Resolve transport: realm → master → global
	let transport: { provider?: string; [key: string]: any } | undefined =
		realm?.emailTransport?.provider ? realm.emailTransport :
		master?.emailTransport?.provider ? master.emailTransport :
		undefined;

	const resolved: ResolvedEmailConfig = transport
		? { provider: transport.provider!, config: transport[transport.provider!] ?? {} }
		: await getGlobalEmailConfig();

	// Apply branding from-address override (display identity, not transport)
	const branding = (realm ?? master)?.branding as { emailFromName?: string; emailFromAddress?: string } | undefined;
	if (branding?.emailFromName || branding?.emailFromAddress) {
		resolved.from = { fromName: branding.emailFromName, fromEmail: branding.emailFromAddress };
	}

	return resolved;
}

// ── Send helpers ───────────────────────────────────────────────────────────

async function dispatchEmail(resolved: ResolvedEmailConfig, to: string, subject: string, html: string, text?: string) {
	const { provider, config, from } = resolved;
	try {
		if (provider === 'resend')           return await sendViaResend(config, to, subject, html, text, from);
		if (provider === 'microsoft_graph')  return await sendViaMicrosoftGraph(config, to, subject, html, text, from);

		// FBA providers: apply from override where supported
		const effectiveConfig = from
			? { ...config, ...(from.fromEmail ? { fromEmail: from.fromEmail } : {}), ...(from.fromName ? { fromName: from.fromName } : {}) }
			: config;
		await sendEmail({ provider, config: effectiveConfig, to, subject, html, ...(text ? { text } : {}) });
	} catch (err) {
		log.error('Email dispatch failed', { provider, to, error: err });
		throw err;
	}
}

/** Send using global system_settings transport */
export async function sendEmailWithSystemConfig(to: string, subject: string, html: string, text?: string, from?: EmailFrom) {
	const resolved = await getGlobalEmailConfig();
	if (from) resolved.from = from;
	return dispatchEmail(resolved, to, subject, html, text);
}

/** Send using realm-specific transport (falls back to global) */
export async function sendEmailWithRealm(realmCode: string, to: string, subject: string, html: string, text?: string) {
	const resolved = await getEmailConfigForRealm(realmCode);
	return dispatchEmail(resolved, to, subject, html, text);
}

/** Test a transport config directly (used by settings action) */
export async function testEmailConfig(provider: string, config: Record<string, unknown>, to: string) {
	const subject = '🧪 Aksara SSO — Email Configuration Test';
	const html = `<div style="font-family:Arial,sans-serif;padding:20px">
		<h2 style="color:#4f46e5">✅ Email Configuration Successful!</h2>
		<p><strong>Provider:</strong> ${provider}</p>
		<p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
		<p style="color:#6b7280;font-size:14px">If you received this, the transport is configured correctly.</p>
	</div>`;
	const text = `Email Test\nProvider: ${provider}\nTime: ${new Date().toLocaleString()}`;
	return dispatchEmail({ provider, config }, to, subject, html, text);
}
