import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';

/**
 * GET /api/realms/[code]
 * Fetch a single realm (organization) by code
 */
export const GET: RequestHandler = async ({ params }) => {
	const db = getDB();
	const org = await db.collection('organizations').findOne({
		code: params.code
	});

	if (!org) {
		return json({ error: 'Realm not found' }, { status: 404 });
	}

	// Get user count
	const userCount = await db.collection('identities').countDocuments({
		organizationId: org._id.toString()
	});

	return json({
		...org,
		_id: org._id.toString(),
		parentId: org.parentId?.toString() || null,
		userCount
	});
};

/**
 * PUT /api/realms/[code]
 * Update a realm (organization)
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();
		const data = await request.json();

		// Validate required fields
		if (!data.name) {
			return json({ error: 'Realm name is required' }, { status: 400 });
		}

		// Update realm
		const result = await db.collection('organizations').updateOne(
			{ code: params.code },
			{
				$set: {
					name: data.name,
					legalName: data.legalName || data.name,
					type: data.type || 'subsidiary',
					description: data.description || '',
					isActive: data.isActive !== undefined ? data.isActive : true,
					updatedAt: new Date()
				}
			}
		);

		if (result.matchedCount === 0) {
			return json({ error: 'Realm not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Realm updated successfully' });
	} catch (error: any) {
		console.error('Error updating realm:', error);
		return json({ error: error.message || 'Failed to update realm' }, { status: 500 });
	}
};

/**
 * DELETE /api/realms/[code]
 * Delete a realm (organization)
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const db = getDB();

		// Check if realm has users
		const userCount = await db.collection('identities').countDocuments({
			'customProperties.organizationCode': params.code
		});

		if (userCount > 0) {
			return json(
				{ error: `Cannot delete realm. It has ${userCount} user(s).` },
				{ status: 400 }
			);
		}

		// Check if realm has org units
		const orgUnitCount = await db.collection('org_units').countDocuments({
			'organization': params.code
		});

		if (orgUnitCount > 0) {
			return json(
				{ error: `Cannot delete realm. It has ${orgUnitCount} organizational unit(s).` },
				{ status: 400 }
			);
		}

		const result = await db.collection('organizations').deleteOne({ code: params.code });

		if (result.deletedCount === 0) {
			return json({ error: 'Realm not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Realm deleted successfully' });
	} catch (error: any) {
		console.error('Error deleting realm:', error);
		return json({ error: error.message || 'Failed to delete realm' }, { status: 500 });
	}
};
