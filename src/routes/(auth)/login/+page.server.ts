import { fail, redirect } from '@sveltejs/kit';
import { identityRepository } from '$lib/db/identity-repository';
import { passwordService } from '$lib/auth/password';
import { sessionManager } from '$lib/auth/session';
import { logAuth } from '$lib/audit/logger';
import { getDB } from '$lib/db/connection';
import { getBranding } from '$lib/branding';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}

	const db = getDB();

	// Check if self-registration is enabled
	const registrationSetting = await db.collection('system_settings').findOne({
		key: 'enable_registration'
	});

	// Load branding (from MASTER organization or default)
	const branding = await getBranding();

	return {
		isRegistrationEnabled: registrationSetting?.value === true,
		branding
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const username = data.get('email')?.toString(); // Can be email or NIK
		const password = data.get('password')?.toString();

		const ipAddress = getClientAddress();
		const userAgent = request.headers.get('user-agent') || undefined;

		if (!username || !password) {
			return fail(400, {
				error: 'Username/Email/NIK dan password harus diisi',
				email: username,
			});
		}

		// Try to find identity by email, username, or employeeId (NIK)
		const identity = await identityRepository.findByEmailOrNIK(username);

		if (!identity) {
			// Log failed login attempt
			await logAuth('login_failed', undefined, {
				ipAddress,
				userAgent,
				username,
				reason: 'Identity not found'
			});

			return fail(401, {
				error: 'Username/Email/NIK atau password salah',
				email: username,
			});
		}

		if (!identity.isActive) {
			// Log failed login attempt (inactive account)
			await logAuth('login_failed', identity._id!.toString(), {
				ipAddress,
				userAgent,
				email: identity.email,
				username: identity.username,
				reason: 'Account inactive'
			});

			return fail(403, {
				error: 'Akun Anda tidak aktif. Silakan hubungi administrator.',
				email: username,
			});
		}

		const isPasswordValid = await passwordService.verifyPassword(identity.password, password);

		if (!isPasswordValid) {
			// Log failed login attempt (wrong password)
			await logAuth('login_failed', identity._id!.toString(), {
				ipAddress,
				userAgent,
				email: identity.email,
				username: identity.username,
				reason: 'Invalid password'
			});

			return fail(401, {
				error: 'Username/Email/NIK atau password salah',
				email: username,
			});
		}

		await identityRepository.updateLastLogin(identity._id!.toString());

		const session = await sessionManager.createSession(
			identity._id!.toString(),
			identity.email || identity.username,
			identity.username,
			identity.roles,
			identity.firstName,
			identity.lastName,
			identity.organizationId
		);

		sessionManager.setSessionCookie(cookies, session.sessionId);

		// Log successful login
		await logAuth('login', identity._id!.toString(), {
			ipAddress,
			userAgent,
			email: identity.email,
			username: identity.username
		});

		throw redirect(302, '/');
	},
};
