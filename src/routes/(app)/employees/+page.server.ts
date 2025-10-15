import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';

export const load: PageServerLoad = async () => {
	const db = getDB();

	const employees = await db
		.collection('employees')
		.aggregate([
			{
				$lookup: {
					from: 'organizations',
					localField: 'organizationId',
					foreignField: '_id',
					as: 'organization',
				},
			},
			{ $sort: { createdAt: -1 } },
		])
		.toArray();

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
	};
};
