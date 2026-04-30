import type { PageServerLoad, Actions } from './$types';
import { db, Repository, lazy } from '$lib/db/db';
import { fail } from '@sveltejs/kit';
import { generateVerificationToken, hashToken } from '$lib/crypto';
import { sendMail } from '$lib/email/email-service';
import { resolveRealmCode } from '$lib/services/settings-service';
import { getVerificationEmail } from '$lib/email/templates';
import { useLogger } from '@ak-sara/fbao/foundation';
import { env } from '$env/dynamic/private';

const log = useLogger({ module: 'auth:resend-verification' });

const verificationTokens = new Repository(lazy, 'verification_tokens');

export const load: PageServerLoad = async () => {
	return {appName:env.APPNAME};
};

export const actions: Actions = {
	default: async ({ locals }) => {
		const formData = locals.body
		const email = formData?.email;

		if (!email) {
			return fail(400, { error: 'Email wajib diisi', email });
		}

		// Find the identity
		const identity = await db.identities.findOne({ email });

		if (!identity) {
			// Don't reveal if email exists or not (security best practice)
			return {
				success: true,
				message: 'Jika email terdaftar, link verifikasi akan dikirim ke email Anda.'
			};
		}

		// Check if already verified
		if (identity.emailVerified) {
			return fail(400, {
				error: 'Email sudah diverifikasi. Anda dapat login sekarang.',
				email
			});
		}

		// Check rate limiting: prevent sending too many emails
		const recentToken = await verificationTokens.findOne({
			email,
			type: 'email_verification',
			createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
		});

		if (recentToken) {
			return fail(429, {
				error: 'Too many request. wait for 5 minute before each retry.',
				email
			});
		}

		try {
			// Generate new verification token
			const token = generateVerificationToken();
			const tokenHash = hashToken(token);

			// Invalidate old tokens for this email
			await verificationTokens.col.updateMany(
				{
					email,
					type: 'email_verification',
					used: false
				},
				{
					$set: {
						used: true,
						invalidatedAt: new Date()
					}
				}
			);

			// Store new token
			await verificationTokens.insertOne({
				email,
				tokenHash,
				type: 'email_verification',
				used: false,
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
			});

			// Send verification email
			const emailTemplate = getVerificationEmail(token, identity.firstName);
			const realmCode = await resolveRealmCode(identity.organizationId);
			const sent = await sendMail(realmCode, email, emailTemplate.subject, emailTemplate.html, emailTemplate.text);
			if (!sent.ok) throw new Error(sent.reason);

			return {
				success: true,
				message: 'Email verifikasi telah dikirim. Silakan cek inbox Anda.'
			};
		} catch (error: any) {
			log.error('Error resending verification email', { error });
			return fail(500, {
				error: 'Gagal mengirim email verifikasi. Silakan coba lagi nanti.',
				email
			});
		}
	}
};
