import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';
import { json, error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

// GET /api/org-units/search?search=division&organizationId=xxx&currentUnitId=xxx&page=1&pageSize=10
export const GET: RequestHandler = async ({ url }) => {
	const db = getDB();
	const search = url.searchParams.get('search') || '';
	const organizationId = url.searchParams.get('organizationId');
	const currentUnitId = url.searchParams.get('currentUnitId');
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

	try {
		// Build filter
		const filter: any = {
			isActive: true
		};

		// Add search filter if provided
		if (search) {
			filter.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ code: { $regex: search, $options: 'i' } },
				{ shortName: { $regex: search, $options: 'i' } }
			];
		}

		// Filter by organization if provided (validate ObjectId first)
		if (organizationId && ObjectId.isValid(organizationId)) {
			filter.organizationId = new ObjectId(organizationId);
		}

		// Get total count
		const total = await db.collection('org_units').countDocuments(filter);

		// Get paginated org units
		let orgUnits = await db
			.collection('org_units')
			.find(filter)
			.sort({ level: 1, sortOrder: 1, name: 1 })
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.toArray();

		// Exclude current unit and its descendants if currentUnitId provided (validate ObjectId first)
		if (currentUnitId && ObjectId.isValid(currentUnitId)) {
			const descendants = await getAllDescendants(db, currentUnitId);
			const excludeIds = [currentUnitId, ...descendants];

			orgUnits = orgUnits.filter(
				(unit) => !excludeIds.includes(unit._id.toString())
			);
		}

		// Format results
		const items = orgUnits.map((unit) => ({
			_id: unit._id.toString(),
			code: unit.code,
			name: unit.name,
			shortName: unit.shortName || '',
			type: unit.type,
			level: unit.level || 0
		}));

		return json({
			items,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize)
		});
	} catch (err) {
		console.error('Org unit search error:', err);
		throw error(500, 'Failed to search org units');
	}
};

// Helper: Get all descendant IDs
async function getAllDescendants(db: any, parentId: string): Promise<string[]> {
	const descendants: string[] = [];
	const queue = [parentId];

	while (queue.length > 0) {
		const currentId = queue.shift()!;

		// Validate ObjectId before converting
		if (!ObjectId.isValid(currentId)) {
			continue;
		}

		const children = await db
			.collection('org_units')
			.find({ parentId: new ObjectId(currentId) })
			.toArray();

		for (const child of children) {
			const childId = child._id.toString();
			descendants.push(childId);
			queue.push(childId);
		}
	}

	return descendants;
}
