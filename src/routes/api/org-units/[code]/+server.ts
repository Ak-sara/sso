import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';
import { json, error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

// GET /api/org-units/[code] - Fetch single org unit by code
export const GET: RequestHandler = async ({ params }) => {
	const db = getDB();

	try {
		const orgUnit = await db.collection('org_units')
			.findOne({ code: params.code });

		if (!orgUnit) {
			throw error(404, 'Organization unit not found');
		}

		// Fetch parent name if parentId exists
		let parentName = null;
		if (orgUnit.parentId) {
			const parent = await db.collection('org_units')
				.findOne({ _id: new ObjectId(orgUnit.parentId) });
			parentName = parent?.name || null;
		}

		return json({
			_id: orgUnit._id.toString(),
			code: orgUnit.code,
			name: orgUnit.name,
			unitType: orgUnit.unitType,
			description: orgUnit.description || '',
			parentId: orgUnit.parentId?.toString() || null,
			parentName,
			level: orgUnit.level,
			isActive: orgUnit.isActive !== false
		});
	} catch (err) {
		console.error('GET org unit error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to fetch organization unit');
	}
};

// PUT /api/org-units/[code] - Update org unit
export const PUT: RequestHandler = async ({ params, request }) => {
	const db = getDB();

	try {
		const body = await request.json();

		// Find the org unit by code
		const existingUnit = await db.collection('org_units')
			.findOne({ code: params.code });

		if (!existingUnit) {
			throw error(404, 'Organization unit not found');
		}

		// Update only allowed fields
		const updateData: any = {
			updatedAt: new Date()
		};

		if (body.name !== undefined) updateData.name = body.name;
		if (body.shortName !== undefined) updateData.shortName = body.shortName;
		if (body.type !== undefined) updateData.type = body.type;
		if (body.description !== undefined) updateData.description = body.description;
		if (body.isActive !== undefined) updateData.isActive = body.isActive;

		// Handle parentId (empty string means no parent)
		if (body.parentId !== undefined) {
			updateData.parentId = body.parentId === '' ? null : body.parentId;
		}

		// Handle organizationId
		if (body.organizationId !== undefined) {
			updateData.organizationId = body.organizationId;
		}

		// Update the org unit
		const result = await db.collection('org_units').updateOne(
			{ _id: existingUnit._id },
			{ $set: updateData }
		);

		if (result.matchedCount === 0) {
			throw error(404, 'Organization unit not found');
		}

		return json({ success: true });
	} catch (err) {
		console.error('PUT org unit error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to update organization unit');
	}
};

// DELETE /api/org-units/[code] - Delete org unit
export const DELETE: RequestHandler = async ({ params }) => {
	const db = getDB();

	try {
		// Find the org unit by code
		const existingUnit = await db.collection('org_units')
			.findOne({ code: params.code });

		if (!existingUnit) {
			throw error(404, 'Organization unit not found');
		}

		// Check if unit has children
		const childCount = await db.collection('org_units')
			.countDocuments({ parentId: existingUnit._id.toString() });

		if (childCount > 0) {
			throw error(400, 'Cannot delete unit with child units. Please delete or reassign child units first.');
		}

		// Check if unit has employees assigned
		const employeeCount = await db.collection('identities')
			.countDocuments({
				identityType: 'employee',
				orgUnit: existingUnit._id.toString()
			});

		if (employeeCount > 0) {
			throw error(400, `Cannot delete unit with ${employeeCount} assigned employees. Please reassign employees first.`);
		}

		// Delete the org unit
		const result = await db.collection('org_units').deleteOne(
			{ _id: existingUnit._id }
		);

		if (result.deletedCount === 0) {
			throw error(404, 'Organization unit not found');
		}

		return json({ success: true, message: 'Organization unit deleted successfully' });
	} catch (err) {
		console.error('DELETE org unit error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to delete organization unit');
	}
};
