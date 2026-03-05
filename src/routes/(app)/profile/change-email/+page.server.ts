import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getDB } from '$lib/db/connection';
import { sendOTP, validateOTP } from '$lib/auth/otp';
import { logEmailChange } from '$lib/audit/auth-logger';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	if (!session) {
		return { currentEmail: null };
	}

	return {
		currentEmail: session.email
	};
};

export const actions: Actions = {
	sendOTP: async ({ locals, request }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const newEmail = formData.get('newEmail') as string;

		if (!newEmail) {
			return fail(400, { error: 'Email baru wajib diisi', newEmail });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(newEmail)) {
			return fail(400, { error: 'Format email tidak valid', newEmail });
		}

		// Check if email is already in use
		const db = getDB();
		const existingUser = await db.collection('identities').findOne({ email: newEmail });

		if (existingUser) {
			return fail(400, { error: 'Email sudah digunakan oleh pengguna lain', newEmail });
		}

		// Send OTP to new email
		const result = await sendOTP({
			email: newEmail,
			purpose: 'verification',
			firstName: session.firstName,
			expiryMinutes: 15
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Gagal mengirim OTP', newEmail });
		}

		return {
			otpSent: true,
			newEmail,
			message: 'Kode OTP telah dikirim ke email baru Anda. Silakan periksa inbox Anda.'
		};
	},

	verifyAndChange: async ({ locals, request }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const newEmail = formData.get('newEmail') as string;
		const otpCode = formData.get('otpCode') as string;

		if (!newEmail || !otpCode) {
			return fail(400, { error: 'Email dan kode OTP wajib diisi', newEmail });
		}

		// Verify OTP
		const verification = await validateOTP(newEmail, otpCode, 'verification');

		if (!verification.isValid) {
			return fail(400, {
				error: verification.error || 'Kode OTP tidak valid',
				newEmail,
				otpSent: true
			});
		}

		// Check email availability again (race condition prevention)
		const db = getDB();
		const existingUser = await db.collection('identities').findOne({ email: newEmail });

		if (existingUser) {
			return fail(400, { error: 'Email sudah digunakan oleh pengguna lain', newEmail });
		}

		try {
			const oldEmail = session.email;

			// Update email
			const result = await db.collection('identities').updateOne(
				{ _id: { $oid: session.userId } },
				{
					$set: {
						email: newEmail,
						emailVerified: true,
						updatedAt: new Date()
					}
				}
			);

			if (result.modifiedCount === 0) {
				return fail(500, { error: 'Gagal mengubah email', newEmail });
			}

			// Update all active sessions with new email
			await db.collection('sessions').updateMany(
				{ userId: session.userId },
				{
					$set: {
						email: newEmail
					}
				}
			);

			// Log audit event
			await logEmailChange(session.userId, oldEmail, newEmail);

			return {
				success: true,
				message: 'Email berhasil diubah! Silakan login ulang untuk melihat perubahan.'
			};
		} catch (error: any) {
			console.error('Error changing email:', error);
			return fail(500, { error: 'Terjadi kesalahan saat mengubah email', newEmail });
		}
	}
};
