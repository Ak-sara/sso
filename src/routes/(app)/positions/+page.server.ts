import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const db = getDB();
	const positions = await db.collection('positions').find({}).sort({ level: 1, name: 1 }).toArray();

	return {
		positions: positions.map((p) => ({
			...p,
			_id: p._id.toString(),
			organizationId: p.organizationId?.toString() || null
		})),
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code') as string;
		const name = formData.get('name') as string;
		const grade = formData.get('grade') as string;
		const level = parseInt(formData.get('level') as string) || 0;
		const description = formData.get('description') as string;

		if (!code || !name) {
			return fail(400, { error: 'Code and name are required' });
		}

		const db = getDB();

		// Check if code already exists
		const existing = await db.collection('positions').findOne({ code });
		if (existing) {
			return fail(400, { error: 'Position code already exists' });
		}

		await db.collection('positions').insertOne({
			code,
			name,
			grade: grade || '',
			level,
			description: description || '',
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return { success: 'Position created successfully' };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code') as string;

		if (!code) {
			return fail(400, { error: 'Position code is required' });
		}

		const db = getDB();

		// Check if position is in use
		const usageCount = await db.collection('identities').countDocuments({
			'customProperties.positionCode': code
		});

		if (usageCount > 0) {
			return fail(400, { error: `Cannot delete. Position is assigned to ${usageCount} employee(s).` });
		}

		const result = await db.collection('positions').deleteOne({ code });

		if (result.deletedCount === 0) {
			return fail(404, { error: 'Position not found' });
		}

		return { success: 'Position deleted successfully' };
	}
};
