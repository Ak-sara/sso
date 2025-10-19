import { fail, redirect } from '@sveltejs/kit';
import { userRepository } from '$lib/db/repositories';
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

		// Try to find user by email or NIK
		const user = await userRepository.findByEmailOrNIK(username);

		if (!user) {
			return fail(401, {
				error: 'Username/Email/NIK atau password salah',
				email: username,
			});
		}

		if (!user.isActive) {
			return fail(403, {
				error: 'Akun Anda tidak aktif. Silakan hubungi administrator.',
				email,
			});
		}

		const isPasswordValid = await passwordService.verifyPassword(user.password, password);

		if (!isPasswordValid) {
			return fail(401, {
				error: 'Username/Email/NIK atau password salah',
				email: username,
			});
		}

		await userRepository.updateLastLogin(user._id!.toString());

		const session = await sessionManager.createSession(
			user._id!.toString(),
			user.email,
			user.username,
			user.roles,
			user.firstName,
			user.lastName,
			user.organizationId
		);

		sessionManager.setSessionCookie(cookies, session.sessionId);

		throw redirect(302, '/');
	},
};
