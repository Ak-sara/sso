import { sendEmail, useLogger, defineJob, useQueue } from '@ak-sara/fbao/foundation';
import { getEmailConfig } from '$lib/services/settings-service';
import type { EmailFrom,EmailSystemConfig } from '$lib/services/settings-service';

const log = useLogger({ module: 'email:service' });

// ── Provider implementations ───────────────────────────────────────────────

async function sendViaResend(config: any, to: string, subject: string, html: string, text?: string, from?: EmailFrom) {
	const fromEmail = config.fromEmail || from?.fromEmail;
	const fromName  = config.fromName || from?.fromName;
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

async function sendViaMicrosoftGraph(config: any, to: string, subject: string, html: string, text?: string, from?: EmailFrom) {
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

// ── Send ───────────────────────────────────────────────────────────────────

export type EmailResult = { ok: true } | { ok: false; reason: string };

async function dispatchEmail(resolved: EmailSystemConfig, to: string, subject: string, html: string, text?: string) {
	const { provider, config, from } = resolved;
	// log.info('Dispatching email', { provider, to, subject });
	try {
		if (provider === 'resend')          return await sendViaResend(config, to, subject, html, text, from);
		if (provider === 'microsoft_graph') return await sendViaMicrosoftGraph(config, to, subject, html, text, from);
		const effectiveConfig = from
			? { ...config, ...(from.fromEmail ? { fromEmail: from.fromEmail } : {}), ...(from.fromName ? { fromName: from.fromName } : {}) }
			: config;
		await sendEmail({ provider, config: effectiveConfig, to, subject, html, ...(text ? { text } : {}) });
		log.info('Email dispatched successfully', { provider, to });
	} catch (err: any) {
		log.error('Email dispatch failed', { provider, to, subject, error: err?.message ?? err });
		throw err;
	}
}

/**
 * Send email inline. realmCode undefined → system config directly.
 * Fallback chain: realm transport → system config → no provider.
 * Never throws — returns EmailResult so callers handle failure explicitly.
 */
export async function sendMail(realmCode: string | undefined, to: string, subject: string, html: string, text?: string): Promise<EmailResult> {
	// log.info('sendMail called', { realmCode: realmCode ?? 'system', to, subject });
	try {
		const resolved = await getEmailConfig(realmCode);
		if (!resolved.provider) {
			log.warn('sendMail: no provider configured', { realmCode, to });
			return { ok: false, reason: 'no_provider' };
		}
		await dispatchEmail(resolved, to, subject, html, text);
		log.info('sendMail success', { resolved, to, subject });
		return { ok: true };
	} catch (err: any) {
		const reason: string = err?.message ?? 'send_failed';
		const structured = reason.includes('not configured') ? 'not_configured' : reason;
		log.error('sendMail failed', { realmCode, to, subject, reason: structured });
		return { ok: false, reason: structured };
	}
}

// ── Queue ──────────────────────────────────────────────────────────────────

interface EmailJobPayload {
	realmCode: string | undefined; to: string; subject: string; html: string; text?: string;
}

defineJob<EmailJobPayload>('send-email', async ({ realmCode, to, subject, html, text }) => {
	log.info('Processing queued email job', { realmCode, to, subject });
	const r = await sendMail(realmCode, to, subject, html, text);
	if (!r.ok) {
		log.error('Queued email job failed', { realmCode, to, subject, reason: r.reason });
		throw new Error(r.reason); // triggers FBA retry
	}
	log.info('Queued email job completed', { realmCode, to });
}, { retries: 3, timeout: 30_000 });

/**
 * Enqueue an email for async delivery with automatic retries.
 * Use for fire-and-forget sends (welcome emails, notifications).
 * Use sendMail() instead when the caller needs immediate delivery feedback.
 */
export async function queueEmail(realmCode: string | undefined, to: string, subject: string, html: string, text?: string): Promise<void> {
	log.info('Queueing email', { realmCode: realmCode ?? 'system', to, subject });
	try {
		await useQueue().add('send-email', { realmCode, to, subject, html, text });
		log.info('Email queued successfully', { realmCode, to });
	} catch (err: any) {
		log.error('Failed to queue email', { realmCode, to, subject, error: err?.message ?? err });
		throw err;
	}
}

/** Test a transport config directly (used by settings action) */
export async function testEmailConfig(provider: string, config: Record<string, unknown>, to: string) {
	const subject = 'Aksara SSO — Email Configuration Test';
	const html = `<div style="font-family:Arial,sans-serif;padding:20px">
		<h2 style="color:#4f46e5">Email Configuration Successful</h2>
		<p><strong>Provider:</strong> ${provider}</p>
		<p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
		<p style="color:#6b7280;font-size:14px">If you received this, the transport is configured correctly.</p>
	</div>`;
	const text = `Email Test\nProvider: ${provider}\nTime: ${new Date().toLocaleString()}`;
	log.info('Sending test email', { provider, to });
	return dispatchEmail({ provider, config }, to, subject, html, text);
}
