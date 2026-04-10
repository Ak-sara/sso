import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db/db';
import { sendOTP, validateOTP } from '$lib/auth/otp';
import { sessionManager } from '$lib/auth/session';
import { logAuthEvent, logLoginSuccess, logLoginFailed } from '$lib/audit/auth-logger';
import { useLogger } from '@ak-sara/fbao/foundation';
import { ObjectId } from 'mongodb';

const log = useLogger({ module: 'auth:login-otp' });

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	sendOTP: async ({ locals }) => {
		const formData = locals.body
		const email = formData?.email;

		if (!email) {
			return fail(400, { error: 'Email wajib diisi', email });
		}

		// Check if user exists
		const identity = await db.identities.findOne({ email });

		if (!identity) {
			// Don't reveal if email exists (security best practice)
			return {
				otpSent: true,
				email,
				message: 'Jika email terdaftar, kode OTP akan dikirim.'
			};
		}

		// Check if account is active
		if (!identity.isActive) {
			return fail(400, { error: 'Akun Anda tidak aktif. Silakan hubungi administrator.', email });
		}

		// Send OTP
		const result = await sendOTP({
			email,
			purpose: 'login',
			firstName: identity.firstName,
			expiryMinutes: 10
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Gagal mengirim OTP', email });
		}

		// Log OTP sent
		await logAuthEvent({
			eventType: 'login_otp_sent',
			identityId: identity?._id as string|undefined,
			email,
			success: true
		});

		return {
			otpSent: true,
			email,
			message: 'Kode OTP telah dikirim ke email Anda.'
		};
	},

	verifyOTP: async ({ locals, cookies }) => {
		const formData = locals.body
		const email = formData?.email;
		const otpCode = formData?.otpCode;

		if (!email || !otpCode) {
			return fail(400, { error: 'Email dan kode OTP wajib diisi', email, otpSent: true });
		}

		// Get identity
		const identity = await db.identities.findOne({ email });

		if (!identity) {
			await logLoginFailed(email, 'user_not_found');
			return fail(400, { error: 'Email atau kode OTP tidak valid', email, otpSent: true });
		}

		// Verify OTP
		const verification = await validateOTP(email, otpCode, 'login');

		if (!verification.isValid) {
			await logLoginFailed(email, 'invalid_otp');
			return fail(400, {
				error: verification.error || 'Kode OTP tidak valid',
				email,
				otpSent: true
			});
		}

		try {
			// Create session
			const session = await sessionManager.createSession(
				identity._id?.toString() as string,
				identity.email as string,
				identity.username,
				identity.roles || ['user'],
				identity.firstName,
				identity.lastName,
				identity.organizationId
			);

			// Set session cookie
			sessionManager.setSessionCookie(cookies, session.sessionId);

			// Log successful login
			await logLoginSuccess(identity._id?.toString() as string, identity.email as string, {
				sessionId: session.sessionId,
				method: 'otp'
			});

			// Log OTP verified
			await logAuthEvent({
				eventType: 'login_otp_verified',
				identityId: identity._id?.toString() as string,
				email,
				success: true,
				sessionId: session.sessionId
			});

			throw redirect(303, '/');
		} catch (error: any) {
			// Handle redirect
			if (error.status === 303) {
				throw error;
			}

			log.error('Error during OTP login', { error });
			return fail(500, { error: 'Terjadi kesalahan saat login', email, otpSent: true });
		}
	}
};
