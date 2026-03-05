import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import { sanitizePaginationParams } from '$lib/utils/pagination';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ url }) => {
	const db = getDB();

	const params = sanitizePaginationParams({
		page: url.searchParams.get('page') || undefined,
		pageSize: url.searchParams.get('pageSize') || undefined,
		sortKey: url.searchParams.get('sortKey') || undefined,
		sortDirection: url.searchParams.get('sortDirection') as 'asc' | 'desc' | undefined,
		search: url.searchParams.get('search') || undefined
	});

	const searchFilter = params.search
		? {
				$or: [
					{ action: { $regex: params.search, $options: 'i' } },
					{ resource: { $regex: params.search, $options: 'i' } },
					{ resourceId: { $regex: params.search, $options: 'i' } }
				]
		  }
		: {};

	const sortField = params.sortKey || 'timestamp';
	const sortDir = params.sortDirection === 'desc' ? -1 : 1;
	const skip = (params.page - 1) * params.pageSize;

	const [auditLogs, total] = await Promise.all([
		db.collection('audit_logs')
			.find(searchFilter)
			.sort({ [sortField]: sortDir })
			.skip(skip)
			.limit(params.pageSize)
			.toArray(),
		db.collection('audit_logs').countDocuments(searchFilter)
	]);

	// Fetch user info for identityId references
	const identityIds = auditLogs
		.map(log => log.identityId)
		.filter(id => id && id !== 'system' && ObjectId.isValid(id));

	const identities = identityIds.length > 0
		? await db.collection('identities')
			.find({ _id: { $in: identityIds.map(id => new ObjectId(id)) } })
			.toArray()
		: [];

	const identityMap = new Map(
		identities.map(identity => [
			identity._id.toString(),
			{
				fullName: identity.fullName,
				email: identity.email,
				username: identity.username,
				employeeId: identity.employeeId
			}
		])
	);

	return {
		auditLogs: auditLogs.map((log) => {
			const identity = log.identityId && log.identityId !== 'system'
				? identityMap.get(log.identityId)
				: null;

			return {
				...log,
				_id: log._id.toString(),
				timestamp: log.timestamp.toISOString(),
				identityInfo: identity ? {
					name: identity.fullName || identity.username,
					email: identity.email,
					employeeId: identity.employeeId
				} : (log.identityId === 'system' ? { name: 'System', email: null, employeeId: null } : null)
			};
		}),
		pagination: {
			page: params.page,
			pageSize: params.pageSize,
			total,
			totalPages: Math.ceil(total / params.pageSize)
		}
	};
};
