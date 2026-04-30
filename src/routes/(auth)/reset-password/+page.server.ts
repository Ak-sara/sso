import type { PageServerLoad, Actions } from './$types';
import { db, Repository, lazy } from '$lib/db/db';
import { fail, redirect } from '@sveltejs/kit';
import { hashToken } from '$lib/crypto';
import { hash } from '@node-rs/argon2';
import { useLogger } from '@ak-sara/fbao/foundation';
import { logAudit } from '$lib/audit/logger';
import { env } from '$env/dynamic/private';

const log = useLogger({ module: 'auth:reset-password' });

const verificationTokens = new Repository(lazy, 'verification_tokens');

export const load: PageServerLoad = async ({ locals }) => {
	const token = locals.query?.token;

	if (!token) {
		return {
			appName:env.APPNAME,
			status: 'error',
			message: 'Token reset password tidak ditemukan'
		};
	}

	// Hash the token to match stored value
	const tokenHash = hashToken(token);

	// Find the reset token
	const resetToken = await verificationTokens.findOne({
		tokenHash,
		type: 'password_reset',
		used: false
	});

	if (!resetToken) {
		return {
			appName:env.APPNAME,
			status: 'error',
			message: 'Token reset password tidak valid atau sudah digunakan'
		};
	}

	// Check if token is expired
	if (new Date() > new Date(resetToken.expiresAt)) {
		return {
			appName:env.APPNAME,
			status: 'error',
			message: 'Token reset password sudah kadaluarsa. Silakan minta token baru.'
		};
	}

	return {
		appName:env.APPNAME,
		status: 'valid',
		token,
		email: resetToken.email
	};
};

export const actions: Actions = {
	default: async ({ locals }) => {
		const formData = locals.body;
		const token = formData?.token;
		const password = formData?.password;
		const confirmPassword = formData?.confirmPassword;

		if (!token || !password || !confirmPassword) {
			return fail(400, {
				error: 'Semua field wajib diisi',
				token
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Password tidak cocok',
				token
			});
		}

		// Check password minimum length
		const passwordMinLength = await db.systemSettings.findOne({
			key: 'password_min_length'
		});
		const minLength = passwordMinLength?.value || 8;

		if (password.length < minLength) {
			return fail(400, {
				error: `Password minimal ${minLength} karakter`,
				token
			});
		}

		// Hash the token
		const tokenHash = hashToken(token);

		// Find the reset token
		const resetToken = await verificationTokens.findOne({
			tokenHash,
			type: 'password_reset',
			used: false
		});

		if (!resetToken) {
			return fail(400, {
				error: 'Token reset password tidak valid atau sudah digunakan',
				token
			});
		}

		// Check if token is expired
		if (new Date() > new Date(resetToken.expiresAt)) {
			return fail(400, {
				error: 'Token reset password sudah kadaluarsa. Silakan minta token baru.',
				token
			});
		}

		try {
			// Hash new password
			const hashedPassword = await hash(password, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			// Get identity first
			const identity = await db.identities.findOne({ email: resetToken.email });

			if (!identity) {
				return fail(400, {
					error: 'Akun tidak ditemukan',
					token
				});
			}

			// Update identity password
			await db.identities.updateOne(
				{ email: resetToken.email },
				{
					password: hashedPassword,
					updatedAt: new Date(),
					passwordChangedAt: new Date()
				} as any
			);

			// Mark token as used
			await verificationTokens.updateOne(
				{ _id: resetToken._id },
				{
					used: true,
					usedAt: new Date()
				}
			);

			// Invalidate all sessions for security (force re-login everywhere)
			const { sessionManager } = await import('$lib/auth/session');
			await sessionManager.invalidateAllUserSessions(identity._id?.toString() as string, 'password_reset');

			await logAudit({
				identityId: identity._id?.toString(),
				action: 'password_reset_complete',
				resource: 'identities',
				resourceId: identity._id?.toString(),
				details: { method: 'email_token', email: identity.email },
			});

			throw redirect(303, '/login?message=Password berhasil diubah. Silakan login dengan password baru Anda.');
		} catch (error: any) {
			// Handle redirect
			if (error.status === 303) {
				throw error;
			}

			log.error('Error resetting password', { error });
			return fail(500, {
				error: 'Terjadi kesalahan saat mengubah password',
				token
			});
		}
	}
};
