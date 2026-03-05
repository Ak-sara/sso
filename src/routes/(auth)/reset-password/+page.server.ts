import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail, redirect } from '@sveltejs/kit';
import { hashToken } from '$lib/crypto';
import { hash } from '@node-rs/argon2';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return {
			status: 'error',
			message: 'Token reset password tidak ditemukan'
		};
	}

	const db = getDB();

	// Hash the token to match stored value
	const tokenHash = hashToken(token);

	// Find the reset token
	const resetToken = await db.collection('verification_tokens').findOne({
		tokenHash,
		type: 'password_reset',
		used: false
	});

	if (!resetToken) {
		return {
			status: 'error',
			message: 'Token reset password tidak valid atau sudah digunakan'
		};
	}

	// Check if token is expired
	if (new Date() > new Date(resetToken.expiresAt)) {
		return {
			status: 'error',
			message: 'Token reset password sudah kadaluarsa. Silakan minta token baru.'
		};
	}

	return {
		status: 'valid',
		token,
		email: resetToken.email
	};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const token = formData.get('token') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

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

		const db = getDB();

		// Check password minimum length
		const passwordMinLength = await db.collection('system_settings').findOne({
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
		const resetToken = await db.collection('verification_tokens').findOne({
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
			const identity = await db.collection('identities').findOne({ email: resetToken.email });

			if (!identity) {
				return fail(400, {
					error: 'Akun tidak ditemukan',
					token
				});
			}

			// Update identity password
			await db.collection('identities').updateOne(
				{ email: resetToken.email },
				{
					$set: {
						password: hashedPassword,
						updatedAt: new Date(),
						passwordChangedAt: new Date()
					}
				}
			);

			// Mark token as used
			await db.collection('verification_tokens').updateOne(
				{ _id: resetToken._id },
				{
					$set: {
						used: true,
						usedAt: new Date()
					}
				}
			);

			// Invalidate all sessions for security (force re-login everywhere)
			const { sessionManager } = await import('$lib/auth/session');
			await sessionManager.invalidateAllUserSessions(identity._id.toString(), 'password_reset');

			// Log audit event
			await db.collection('audit_logs').insertOne({
				eventType: 'password_reset',
				identityId: identity._id.toString(),
				email: identity.email,
				metadata: {
					method: 'email_token'
				},
				timestamp: new Date(),
				ipAddress: null // Can be added from request headers
			});

			throw redirect(303, '/login?message=Password berhasil diubah. Silakan login dengan password baru Anda.');
		} catch (error: any) {
			// Handle redirect
			if (error.status === 303) {
				throw error;
			}

			console.error('Error resetting password:', error);
			return fail(500, {
				error: 'Terjadi kesalahan saat mengubah password',
				token
			});
		}
	}
};
