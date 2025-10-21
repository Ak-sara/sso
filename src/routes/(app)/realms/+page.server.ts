import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const db = getDB();

	// Get all organizations as realms
	const organizations = await db.collection('organizations').find({}).sort({ name: 1 }).toArray();

	// Get user and employee counts per organization
	const realmsWithCounts = await Promise.all(
		organizations.map(async (org) => {
			const [userCount] = await Promise.all([
				db.collection('identities').countDocuments({ organizationId: org._id.toString() }),
			]);

			return {
				...org,
				_id: org._id.toString(),
				parentId: org.parentId?.toString() || null,
				userCount
			};
		})
	);

	return {
		realms: realmsWithCounts,
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const code = formData.get('code') as string;
		const type = formData.get('type') as string;
		const description = formData.get('description') as string;

		if (!name || !code) {
			return fail(400, { error: 'Nama dan kode wajib diisi' });
		}

		const db = getDB();

		// Check if code already exists
		const existing = await db.collection('organizations').findOne({ code });
		if (existing) {
			return fail(400, { error: 'Kode organisasi sudah digunakan' });
		}

		// Create new realm (organization)
		await db.collection('organizations').insertOne({
			code,
			name,
			legalName: name,
			type: type as any,
			description: description || '',
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return { success: 'Realm berhasil dibuat' };
	},
};
