import { fail } from '@sveltejs/kit';
import { db } from '$lib/db/db';
import { passwordService } from '$lib/auth/password';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ locals }) => {
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
};
