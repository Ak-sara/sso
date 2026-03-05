import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail } from '@sveltejs/kit';
import { generateVerificationToken, hashToken } from '$lib/crypto';
import { sendEmailWithSystemConfig } from '$lib/email/email-service';
import { getVerificationEmail } from '$lib/email/templates';

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
		const recentToken = await db
			.collection('verification_tokens')
			.findOne({
				email,
				type: 'email_verification',
				createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
			});

		if (recentToken) {
			return fail(429, {
				error: 'Terlalu banyak permintaan. Silakan tunggu 5 menit sebelum meminta ulang.',
				email
			});
		}

		try {
			// Generate new verification token
			const token = generateVerificationToken();
			const tokenHash = hashToken(token);

			// Invalidate old tokens for this email
			await db.collection('verification_tokens').updateMany(
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
			await db.collection('verification_tokens').insertOne({
				email,
				tokenHash,
				type: 'email_verification',
				used: false,
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
			});

			// Send verification email
			const emailTemplate = getVerificationEmail(token, identity.firstName);
			await sendEmailWithSystemConfig(email, emailTemplate.subject, emailTemplate.html, emailTemplate.text);

			return {
				success: true,
				message: 'Email verifikasi telah dikirim. Silakan cek inbox Anda.'
			};
		} catch (error: any) {
			console.error('Error resending verification email:', error);
			return fail(500, {
				error: 'Gagal mengirim email verifikasi. Silakan coba lagi nanti.',
				email
			});
		}
	}
};
