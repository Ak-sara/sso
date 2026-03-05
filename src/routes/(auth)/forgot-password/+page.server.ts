import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail } from '@sveltejs/kit';
import { generateVerificationToken, hashToken } from '$lib/crypto';
import { sendEmailWithSystemConfig } from '$lib/email/email-service';
import { getPasswordResetEmail } from '$lib/email/templates';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;

		if (!email) {
			return fail(400, { error: 'Email wajib diisi', email });
		}

		const db = getDB();

		// Find the identity
		const identity = await db.collection('identities').findOne({ email });

		// Don't reveal if email exists (security best practice)
		// Always return success message
		if (!identity) {
			return {
				success: true,
				message: 'Jika email terdaftar, link reset password akan dikirim ke email Anda.'
			};
		}

		// Rate limiting: prevent sending too many reset emails
		const recentToken = await db
			.collection('verification_tokens')
			.findOne({
				email,
				type: 'password_reset',
				createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
			});

		if (recentToken) {
			return fail(429, {
				error: 'Terlalu banyak permintaan. Silakan tunggu 5 menit sebelum meminta ulang.',
				email
			});
		}

		try {
			// Generate reset token
			const token = generateVerificationToken();
			const tokenHash = hashToken(token);

			// Invalidate old reset tokens for this email
			await db.collection('verification_tokens').updateMany(
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
			await db.collection('verification_tokens').insertOne({
				email,
				tokenHash,
				type: 'password_reset',
				used: false,
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
			});

			// Send password reset email
			const emailTemplate = getPasswordResetEmail(token, identity.firstName);
			await sendEmailWithSystemConfig(email, emailTemplate.subject, emailTemplate.html, emailTemplate.text);

			return {
				success: true,
				message: 'Link reset password telah dikirim ke email Anda. Silakan cek inbox Anda.'
			};
		} catch (error: any) {
			console.error('Error sending password reset email:', error);
			return fail(500, {
				error: 'Gagal mengirim email reset password. Silakan coba lagi nanti.',
				email
			});
		}
	}
};
