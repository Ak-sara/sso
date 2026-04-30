import type { PageServerLoad, Actions } from './$types';
import { getIdentityById, updateIdentity, upsertAssignment, deleteAssignment } from '$lib/services/identity-service';
import { listOrganizations } from '$lib/services/organization-service';
import { listOrgUnits } from '$lib/services/org-unit-service';
import { listPositions } from '$lib/services/position-service';
import { formatDate, datamap } from '$lib/utils/format';

import { fail } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { db, Repository, lazy } from '$lib/db/db';

import { passwordService } from '$lib/auth/password';
import { sendOTP, validateOTP } from '$lib/auth/otp';
import { useLogger } from '@ak-sara/fbao/foundation';
import { logAudit } from '$lib/audit/logger';
import { get2FAStatus, enable2FA, disable2FA, verify2FAOTP, generateBackupCodes } from '$lib/auth/two-factor';
import { env } from '$env/dynamic/private';

const log = useLogger({ module: 'app:change-email' });

const sessions = new Repository(lazy, 'sessions');

export const load: PageServerLoad = async ({ locals }) => {

	const [identityResult, organizations, orgUnits, positions] = await Promise.all([
		getIdentityById( locals.user!.userId  ),
		listOrganizations(),
		listOrgUnits(),
		listPositions(),
	]);
	const session = locals.session;	
	const status2FA = await get2FAStatus(session!.userId);

	return {
		user: identityResult && identityResult.ok ? identityResult.data : null,
		orgs: datamap(organizations),
		ous: datamap(orgUnits),
		pos: datamap(positions, 'code', 'name'),
		organizations: organizations.map(o => ({ _id: String(o._id), name: o.name, code: o.code })),
		orgUnits: orgUnits.map(u => ({ _id: String(u._id), name: u.name, code: u.code })),
		positions: positions.map(p => ({ _id: String(p._id), name: p.name, code: p.code })),
		appName: env.APPNAME,
		currentEmail: !session ? null : session.email,
		status2FA: !session ? null : status2FA
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
				{ _id: new ObjectId(session.userId) },
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
			return fail(400, { error: 'New Password confirmation isnt match' });
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
			const result = await sendOTP({ email: session.email, purpose: '2fa', firstName: session.firstName, expiryMinutes: 10 });

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
			const result = await sendOTP({ email: session.email, purpose: '2fa', firstName: session.firstName, expiryMinutes: 10 });

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
	},

	updateProfile: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const body = locals.body;
		const updates: Record<string, any> = {};
		for (const field of ['firstName', 'lastName', 'gender', 'dateOfBirth', 'personalEmail', 'phone', 'idNumber', 'taxId']) {
			if (body[field] !== undefined) updates[field] = body[field] || undefined;
		}
		if (updates.firstName || updates.lastName) {
			const first = updates.firstName ?? locals.user.firstName ?? '';
			const last  = updates.lastName  ?? locals.user.lastName  ?? '';
			updates.fullName = `${first} ${last}`.trim();
		}
		const result = await updateIdentity(locals.user.userId, updates);
		if (!result.ok) return fail(result.status || 500, { error: result.error });
		return { success: true };
	},

	upsertAssignment: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const body = locals.body;
		body.startDate = String(body.startDate);
		const result = await upsertAssignment(locals.user.userId, body);
		if (!result.ok) return fail(result.status || 500, { error: result.error });
		return {};
	},

	deleteAssignment: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const assignmentId = locals.body?.assignmentId as string;
		if (!assignmentId) return fail(400, { error: 'Missing assignmentId' });
		const result = await deleteAssignment(locals.user.userId, assignmentId);
		if (!result.ok) return fail(result.status || 500, { error: result.error });
		return {};
	},

};
