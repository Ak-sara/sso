import { fail, redirect } from '@sveltejs/kit';
import { passwordService } from '$lib/auth/password';
import { sessionManager } from '$lib/auth/session';
import { logAudit } from '$lib/audit/logger';
import { findIdentityByEmailOrNIK, updateLastLogin } from '$lib/db/schemas';
import { getSetting } from '$lib/services/settings-service';
import { getBranding } from '$lib/branding';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}

	const [isRegistrationEnabled, branding] = await Promise.all([
		getSetting<boolean>('enable_registration'),
		getBranding(),
	]);

	return {
		isRegistrationEnabled: isRegistrationEnabled === true,
		branding
	};
};

export const actions: Actions = {
	default: async ({ locals, cookies, getClientAddress }) => {
		const post=locals.body
		const username = post?.email; // Can be email or NIK
		const password = post?.password;

		const ipAddress = getClientAddress();
		const userAgent = locals.vars.user_agent || undefined;

		if (!username || !password) {
			return fail(400, {
				error: 'Username/Email/NIK dan password harus diisi',
				email: username,
			});
		}

		// Try to find identity by email, username, or employeeId (NIK)
		const identity = await findIdentityByEmailOrNIK(username);

		if (!identity) {
			// Log failed login attempt
			await logAudit({ action: 'login_failed', resource: 'sessions', status: 'failed', details: { username, reason: 'Identity not found' }, ipAddress, userAgent });

			return fail(401, {
				error: `Username/Email/NIK atau password salah`,
				email: username,
			});
		}

		if (!identity.isActive) {
			// Log failed login attempt (inactive account)
			await logAudit({ action: 'login_failed', resource: 'sessions', identityId: identity._id!.toString(), status: 'failed', details: { email: identity.email, employeeId: identity.employeeId, reason: 'Account inactive' }, ipAddress, userAgent });

			return fail(403, {
				error: 'Akun Anda tidak aktif. Silakan hubungi administrator.',
				email: username,
			});
		}

		const isPasswordValid = await passwordService.verifyPassword(identity.password, password);

		if (!isPasswordValid) {
			// Log failed login attempt (wrong password)
			await logAudit({ action: 'login_failed', resource: 'sessions', identityId: identity._id!.toString(), status: 'failed', details: { email: identity.email, employeeId: identity.employeeId, reason: 'Invalid password' }, ipAddress, userAgent });

			return fail(401, {
				error: 'Username/Email/NIK atau password salah',
				email: username,
			});
		}

		await updateLastLogin(identity._id!.toString());

		const session = await sessionManager.createSession(
			identity._id!.toString(),
			identity.email || identity.employeeId || '',
			identity.employeeId || identity.email || '',
			identity.roles,
			identity.firstName,
			identity.lastName,
			identity.organizationId
		);

		sessionManager.setSessionCookie(cookies, session.sessionId);

		// Log successful login
		await logAudit({ action: 'login', resource: 'sessions', identityId: identity._id!.toString(), details: { email: identity.email, employeeId: identity.employeeId }, ipAddress, userAgent });

		throw redirect(302, '/');
	},
};
