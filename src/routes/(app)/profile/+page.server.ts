import type { PageServerLoad, Actions } from './$types';
import { getIdentityById, updateIdentity} from '$lib/services/identity-service';
import { listOrganizations } from '$lib/services/organization-service';
import { listOrgUnits } from '$lib/services/org-unit-service';
import { listPositions } from '$lib/services/position-service';
import { formatDate, datamap } from '$lib/utils/format';

import { fail } from '@sveltejs/kit';
import { db, Repository, lazy } from '$lib/db/db';

import { passwordService } from '$lib/auth/password';
import { sendOTP, validateOTP } from '$lib/auth/otp';
import { useLogger } from '@ak-sara/fbao/foundation';
import { logAudit } from '$lib/audit/logger';
import { get2FAStatus, enable2FA, disable2FA, send2FAOTP, verify2FAOTP, generateBackupCodes } from '$lib/auth/two-factor';

const log = useLogger({ module: 'app:change-email' });

const sessions = new Repository(lazy, 'sessions');

export const load: PageServerLoad = async ({ locals }) => {

	const [identityResult, organizations, orgUnits, positions] = await Promise.all([
		getIdentityById( locals.user!.userId  ),
		listOrganizations(),
		listOrgUnits({page:0,pageSize:0}),
		listPositions(),
	]);
	const session = locals.session;	
	// const status2FA = await get2FAStatus(session!.userId);

	return {
		user: identityResult && identityResult.ok ? identityResult.data : null,
		orgs: datamap(organizations), 
		ous: datamap(orgUnits.items),
		pos: datamap(positions),

		currentEmail: !session ? null : session.email,
		status2FA: null//!session ? null : status2FA 
	};
};

export const actions: Actions = {
	sendOTP: async ({ locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = locals.body
		const newEmail = formData?.newEmail;

		if (!newEmail) {
			return fail(400, { error: 'Email baru wajib diisi', newEmail });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(newEmail)) {
			return fail(400, { error: 'Format email tidak valid', newEmail });
		}

		// Check if email is already in use
		const existingUser = await db.identities.findOne({ email: newEmail });

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

	verifyAndChange: async ({ locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = locals.body
		const newEmail = formData?.newEmail;
		const otpCode = formData?.otpCode;

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
		const existingUser = await db.identities.findOne({ email: newEmail });

		if (existingUser) {
			return fail(400, { error: 'Email sudah digunakan oleh pengguna lain', newEmail });
		}

		try {
			const oldEmail = session.email;

			// Update email
			const result = await db.identities.col.updateOne(
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
			await sessions.col.updateMany(
				{ userId: session.userId },
				{
					$set: { email: newEmail }
				}
			);

			// Log audit event
			await logAudit({ action: 'email_changed', 
				resource: 'identities', 
				identityId: session.userId, 
				details: { oldEmail, newEmail } });

			return {
				success: true,
				message: 'Email berhasil diubah! Silakan login ulang untuk melihat perubahan.'
			};
		} catch (error: any) {
			log.error('Error changing email', { error });
			return fail(500, { error: 'Terjadi kesalahan saat mengubah email', newEmail });
		}
	},

	defPass: async ({ locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = locals.body
		const currentPassword = data?.currentPassword;
		const newPassword = data?.newPassword;
		const confirmPassword = data?.confirmPassword;

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { error: 'Semua field harus diisi' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Password baru dan konfirmasi tidak cocok' });
		}

		const passwordValidation = passwordService.validatePassword(newPassword);
		if (!passwordValidation.isValid) {
			return fail(400, { error: passwordValidation.errors.join(', ') });
		}

		const identity = await db.identities.findById(locals.user.userId);
		if (!identity) {
			return fail(404, { error: 'Identity tidak ditemukan' });
		}

		const isCurrentPasswordValid = await passwordService.verifyPassword(
			identity.password,
			currentPassword
		);

		if (!isCurrentPasswordValid) {
			return fail(401, { error: 'Password saat ini salah' });
		}

		const hashedPassword = await passwordService.hashPassword(newPassword);

		await db.identities.updateById(locals.user.userId, { password: hashedPassword } as any);

		return { success: true };
	},

	enable2FA: async ({ locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = locals.body
		const otpCode = formData?.otpCode;

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

	disable2FA: async ({ locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = locals.body
		const otpCode = formData?.otpCode;

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

	regenerateBackupCodes2FA: async ({ locals }) => {
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
