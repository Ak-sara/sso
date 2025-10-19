import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
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
					{ employeeId: { $regex: params.search, $options: 'i' } },
					{ firstName: { $regex: params.search, $options: 'i' } },
					{ lastName: { $regex: params.search, $options: 'i' } },
					{ fullName: { $regex: params.search, $options: 'i' } },
					{ email: { $regex: params.search, $options: 'i' } }
				]
		  }
		: {};

	// Get sort field
	const sortField = params.sortKey || 'createdAt';
	const sortDir = params.sortDirection === 'desc' ? -1 : 1;

	// Calculate pagination
	const skip = (params.page - 1) * params.pageSize;

	// Fetch employees with aggregation
	const [employees, total] = await Promise.all([
		db.collection('employees')
			.aggregate([
				{ $match: searchFilter },
				{
					$lookup: {
						from: 'organizations',
						let: { orgId: { $toObjectId: '$organizationId' } },
						pipeline: [
							{ $match: { $expr: { $eq: ['$_id', '$$orgId'] } } },
							{ $project: { name: 1 } }
						],
						as: 'organization'
					}
				},
				{ $sort: { [sortField]: sortDir } },
				{ $skip: skip },
				{ $limit: params.pageSize }
			])
			.toArray(),
		db.collection('employees').countDocuments(searchFilter)
	]);

	return {
		employees: employees.map((emp) => ({
			...emp,
			_id: emp._id.toString(),
			organizationId: emp.organizationId?.toString() || null,
			orgUnitId: emp.orgUnitId?.toString() || null,
			positionId: emp.positionId?.toString() || null,
			userId: emp.userId?.toString() || null,
			organizationName: emp.organization?.[0]?.name || null,
			organization: undefined // Remove non-serializable field
		})),
		pagination: {
			page: params.page,
			pageSize: params.pageSize,
			total,
			totalPages: Math.ceil(total / params.pageSize)
		}
	};
};
