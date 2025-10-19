import { fail, redirect } from '@sveltejs/kit';
import { identityRepository } from '$lib/db/identity-repository';
import { passwordService } from '$lib/auth/password';
import { sessionManager } from '$lib/auth/session';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('email')?.toString(); // Can be email or NIK
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, {
				error: 'Username/Email/NIK dan password harus diisi',
				email: username,
			});
		}

		// Try to find identity by email, username, or employeeId (NIK)
		const identity = await identityRepository.findByEmailOrNIK(username);

		if (!identity) {
			return fail(401, {
				error: 'Username/Email/NIK atau password salah',
				email: username,
			});
		}

		if (!identity.isActive) {
			return fail(403, {
				error: 'Akun Anda tidak aktif. Silakan hubungi administrator.',
				email: username,
			});
		}

		const isPasswordValid = await passwordService.verifyPassword(identity.password, password);

		if (!isPasswordValid) {
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

		throw redirect(302, '/');
	},
};
