import { fail } from '@sveltejs/kit';
import { userRepository } from '$lib/db/repositories';
import { passwordService } from '$lib/auth/password';
import type { Actions, PageServerLoad } from './$types';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const currentPassword = data.get('currentPassword')?.toString();
		const newPassword = data.get('newPassword')?.toString();
		const confirmPassword = data.get('confirmPassword')?.toString();

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

		const user = await userRepository.findById(locals.user.userId);
		if (!user) {
			return fail(404, { error: 'User tidak ditemukan' });
		}

		const isCurrentPasswordValid = await passwordService.verifyPassword(
			user.password,
			currentPassword
		);

		if (!isCurrentPasswordValid) {
			return fail(401, { error: 'Password saat ini salah' });
		}

		const hashedPassword = await passwordService.hashPassword(newPassword);

		await userRepository.updatePassword(locals.user.userId, hashedPassword);

		return { success: true };
	},
};
