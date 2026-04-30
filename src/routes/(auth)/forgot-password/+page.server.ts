import type { PageServerLoad, Actions } from './$types';
import { db, Repository, lazy } from '$lib/db/db';
import { fail } from '@sveltejs/kit';
import { generateVerificationToken, hashToken } from '$lib/crypto';
import { sendMail } from '$lib/email/email-service';
import { resolveRealmCode } from '$lib/services/settings-service';
import { getPasswordResetEmail } from '$lib/email/templates';
import { useLogger } from '@ak-sara/fbao/foundation';
import { env } from '$env/dynamic/private';

const log = useLogger({ module: 'auth:forgot-password' });

const verificationTokens = new Repository(lazy, 'verification_tokens');

export const load: PageServerLoad = async () => {
	return { appName: env.APPNAME || 'Aksara SSO' };
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

		// Don't reveal if email exists (security best practice)
		// Always return success message
		if (!identity) {
			return {
				success: true,
				message: 'Jika email terdaftar, link reset password akan dikirim ke email Anda.'
			};
		}

		// Rate limiting: prevent sending too many reset emails
		const recentToken = await verificationTokens.findOne({
			email, type: 'password_reset',
			createdAt: { $gte: new Date(Date.now() - 1 * 60 * 1000) } // Last 5 minutes
		});

		if (recentToken) {
			return fail(429, { error: 'Too many request. wait for 5 minute before each retry..', email });
		}

		try {
			// Generate reset token
			const token = generateVerificationToken();
			const tokenHash = hashToken(token);

			// Invalidate old reset tokens for this email
			await verificationTokens.col.updateMany(
				{
					email,
					type: 'password_reset',
					used: false
				},
				{
					$set: {
						used: true,
						invalidatedAt: new Date()
					}
				}
			);

			// Store new token (expires in 1 hour for security)
			await verificationTokens.insertOne({
				email,
				tokenHash,
				type: 'password_reset',
				used: false,
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
			});

			// Send password reset email
			const emailTemplate = getPasswordResetEmail(token, identity.firstName);
			const realmCode = await resolveRealmCode(identity.organizationId);
			const sent = await sendMail(realmCode, email, emailTemplate.subject, emailTemplate.html, emailTemplate.text);
			if (!sent.ok) throw new Error(sent.reason);

			return {
				success: true,
				message: 'Password reset link already send to your email. Please check your inbox or spam.'
			};
		} catch (error: any) {
			log.error('Error sending password reset email', { error });
			return fail(500, {
				error: 'Failed sending password reset email. try again later.',
				email
			});
		}
	}
};
