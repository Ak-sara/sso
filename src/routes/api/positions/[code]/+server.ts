import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';

/**
 * GET /api/positions/[code]
 * Fetch a single position by code
 */
export const GET: RequestHandler = async ({ params }) => {
	const db = getDB();
	const position = await db.collection('positions').findOne({
		code: params.code
	});

	if (!position) {
		return json({ error: 'Position not found' }, { status: 404 });
	}

	return json({
		...position,
		_id: position._id.toString(),
		organizationId: position.organizationId?.toString() || null
	});
};

/**
 * PUT /api/positions/[code]
 * Update a position
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();
		const data = await request.json();

		// Validate required fields
		if (!data.name) {
			return json({ error: 'Position name is required' }, { status: 400 });
		}

		// Update position
		const result = await db.collection('positions').updateOne(
			{ code: params.code },
			{
				$set: {
					name: data.name,
					grade: data.grade || '',
					level: data.level || 0,
					description: data.description || '',
					isActive: data.isActive !== undefined ? data.isActive : true,
					updatedAt: new Date()
				}
			}
		);

		if (result.matchedCount === 0) {
			return json({ error: 'Position not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Position updated successfully' });
	} catch (error: any) {
		console.error('Error updating position:', error);
		return json({ error: error.message || 'Failed to update position' }, { status: 500 });
	}
};

/**
 * DELETE /api/positions/[code]
 * Delete a position
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const db = getDB();

		// Check if position is in use
		const usageCount = await db.collection('identities').countDocuments({
			'customProperties.positionCode': params.code
		});

		if (usageCount > 0) {
			return json(
				{ error: `Cannot delete position. It is assigned to ${usageCount} employee(s).` },
				{ status: 400 }
			);
		}

		const result = await db.collection('positions').deleteOne({ code: params.code });

		if (result.deletedCount === 0) {
			return json({ error: 'Position not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Position deleted successfully' });
	} catch (error: any) {
		console.error('Error deleting position:', error);
		return json({ error: error.message || 'Failed to delete position' }, { status: 500 });
	}
};
