import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { hash } from 'argon2';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const db = getDB();
	const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();

	return {
		users: users.map(user => ({
			...user,
			_id: user._id.toString(),
			organizationId: user.organizationId?.toString() || null,
		})),
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const username = formData.get('username') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!firstName || !username || !email || !password) {
			return fail(400, { error: 'Semua field wajib diisi' });
		}

		const db = getDB();

		// Check if user already exists
		const existingUser = await db.collection('users').findOne({
			$or: [{ email }, { username }],
		});

		if (existingUser) {
			return fail(400, { error: 'Email atau username sudah digunakan' });
		}

		// Create user
		const hashedPassword = await hash(password);
		await db.collection('users').insertOne({
			email,
			username,
			password: hashedPassword,
			firstName,
			lastName: lastName || '',
			isActive: true,
			emailVerified: false,
			roles: ['user'],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return { success: 'Pengguna berhasil ditambahkan' };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { error: 'User ID tidak valid' });
		}

		const db = getDB();
		const { ObjectId } = await import('mongodb');

		try {
			await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
			return { success: 'Pengguna berhasil dihapus' };
		} catch (error) {
			return fail(500, { error: 'Gagal menghapus pengguna' });
		}
	},
};
