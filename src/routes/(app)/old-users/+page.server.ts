import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { hash } from '@node-rs/argon2';
import { fail } from '@sveltejs/kit';
import { sanitizePaginationParams } from '$lib/utils/pagination';

export const load: PageServerLoad = async ({ url }) => {
	const db = getDB();

	// Get pagination params from URL
	const params = sanitizePaginationParams({
		page: url.searchParams.get('page') || undefined,
		pageSize: url.searchParams.get('pageSize') || undefined,
		sortKey: url.searchParams.get('sortKey') || undefined,
		sortDirection: url.searchParams.get('sortDirection') as 'asc' | 'desc' | undefined,
		search: url.searchParams.get('search') || undefined
	});

	// Build search filter
	const searchFilter = params.search
		? {
				$or: [
					{ email: { $regex: params.search, $options: 'i' } },
					{ username: { $regex: params.search, $options: 'i' } },
					{ firstName: { $regex: params.search, $options: 'i' } },
					{ lastName: { $regex: params.search, $options: 'i' } }
				]
		  }
		: {};

	// Get sort field
	const sortField = params.sortKey || 'createdAt';
	const sortDir = params.sortDirection === 'desc' ? -1 : 1;

	// Calculate pagination
	const skip = (params.page - 1) * params.pageSize;

	// Fetch users
	const [users, total] = await Promise.all([
		db.collection('users')
			.find(searchFilter)
			.sort({ [sortField]: sortDir })
			.skip(skip)
			.limit(params.pageSize)
			.toArray(),
		db.collection('users').countDocuments(searchFilter)
	]);

	return {
		users: users.map(user => ({
			...user,
			_id: user._id.toString(),
			organizationId: user.organizationId?.toString() || null,
		})),
		pagination: {
			page: params.page,
			pageSize: params.pageSize,
			total,
			totalPages: Math.ceil(total / params.pageSize)
		}
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

	update: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const email = formData.get('email') as string;
		const username = formData.get('username') as string;
		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const password = formData.get('password') as string;

		if (!userId || !email || !username || !firstName) {
			return fail(400, { error: 'Field yang wajib diisi belum lengkap' });
		}

		const db = getDB();
		const { ObjectId } = await import('mongodb');

		// Check if email/username is taken by another user
		const existingUser = await db.collection('users').findOne({
			_id: { $ne: new ObjectId(userId) },
			$or: [{ email }, { username }],
		});

		if (existingUser) {
			return fail(400, { error: 'Email atau username sudah digunakan oleh pengguna lain' });
		}

		// Build update object
		const updateData: any = {
			email,
			username,
			firstName,
			lastName: lastName || '',
			updatedAt: new Date(),
		};

		// Only update password if provided
		if (password && password.trim() !== '') {
			updateData.password = await hash(password);
		}

		try {
			await db.collection('users').updateOne(
				{ _id: new ObjectId(userId) },
				{ $set: updateData }
			);
			return { success: 'Pengguna berhasil diperbarui' };
		} catch (error) {
			return fail(500, { error: 'Gagal memperbarui pengguna' });
		}
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
			// Get user to check if linked to employee
			const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

			// Remove link from employee if exists
			if (user && user.employeeId) {
				await db.collection('employees').updateOne(
					{ _id: new ObjectId(user.employeeId) },
					{ $unset: { userId: '' }, $set: { updatedAt: new Date() } }
				);
			}

			// Delete user
			await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
			return { success: 'Pengguna berhasil dihapus' };
		} catch (error) {
			return fail(500, { error: 'Gagal menghapus pengguna' });
		}
	},
};
