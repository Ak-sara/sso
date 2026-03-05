import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { get2FAStatus, enable2FA, disable2FA, send2FAOTP, verify2FAOTP, generateBackupCodes } from '$lib/auth/two-factor';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	if (!session) {
		return { status2FA: null };
	}

	const status2FA = await get2FAStatus(session.userId);

	return {
		status2FA
	};
};

export const actions: Actions = {
	enable: async ({ locals, request }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const otpCode = formData.get('otpCode') as string;

		if (!otpCode) {
			// Step 1: Send OTP
			const result = await send2FAOTP(session.email, session.firstName);

			if (!result.success) {
				return fail(400, { error: result.error || 'Failed to send OTP' });
			}

			return {
				otpSent: true,
				message: 'Kode OTP telah dikirim ke email Anda. Silakan masukkan kode untuk mengaktifkan 2FA.'
			};
		} else {
			// Step 2: Verify OTP and enable 2FA
			const verification = await verify2FAOTP(session.email, otpCode, session.userId);

			if (!verification.isValid) {
				return fail(400, {
					error: verification.error || 'Kode OTP tidak valid',
					otpSent: true
				});
			}

			// Enable 2FA
			const result = await enable2FA(session.userId, session.email);

			if (!result.success) {
				return fail(500, { error: result.error || 'Gagal mengaktifkan 2FA' });
			}

			// Generate backup codes
			const backupCodes = await generateBackupCodes(session.userId);

			return {
				success: true,
				message: '2FA berhasil diaktifkan!',
				backupCodes
			};
		}
	},

	disable: async ({ locals, request }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const otpCode = formData.get('otpCode') as string;

		if (!otpCode) {
			// Step 1: Send OTP for verification
			const result = await send2FAOTP(session.email, session.firstName);

			if (!result.success) {
				return fail(400, { error: result.error || 'Failed to send OTP' });
			}

			return {
				disableOtpSent: true,
				message: 'Kode OTP telah dikirim ke email Anda untuk verifikasi.'
			};
		} else {
			// Step 2: Verify OTP and disable 2FA
			const verification = await verify2FAOTP(session.email, otpCode, session.userId);

			if (!verification.isValid) {
				return fail(400, {
					error: verification.error || 'Kode OTP tidak valid',
					disableOtpSent: true
				});
			}

			// Disable 2FA
			const result = await disable2FA(session.userId, session.email);

			if (!result.success) {
				return fail(500, { error: result.error || 'Gagal menonaktifkan 2FA' });
			}

			return {
				success: true,
				message: '2FA berhasil dinonaktifkan.'
			};
		}
	},

	regenerateBackupCodes: async ({ locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Check if 2FA is enabled
		const status = await get2FAStatus(session.userId);
		if (!status?.enabled) {
			return fail(400, { error: '2FA belum diaktifkan' });
		}

		// Generate new backup codes
		const backupCodes = await generateBackupCodes(session.userId);

		return {
			success: true,
			message: 'Backup codes berhasil di-generate ulang.',
			backupCodes
		};
	}
};
