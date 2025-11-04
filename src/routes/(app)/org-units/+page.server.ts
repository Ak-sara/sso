import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { sanitizePaginationParams } from '$lib/utils/pagination';
import { getOrgUnitParentOptions, getOrganizationOptions } from '$lib/utils/select-options';
import { ObjectId } from 'mongodb';
import { fail } from '@sveltejs/kit';

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
					{ name: { $regex: params.search, $options: 'i' } },
					{ code: { $regex: params.search, $options: 'i' } },
					{ shortName: { $regex: params.search, $options: 'i' } }
				]
		  }
		: {};

	const sortField = params.sortKey || 'sortOrder';
	const sortDir = params.sortDirection === 'desc' ? -1 : 1;
	const skip = (params.page - 1) * params.pageSize;

	const [orgUnits, total, organizationOptions] = await Promise.all([
		db.collection('org_units')
			.find(searchFilter)
			.sort({ [sortField]: sortDir })
			.skip(skip)
			.limit(params.pageSize)
			.toArray(),
		db.collection('org_units').countDocuments(searchFilter),
		getOrganizationOptions() // Load organization options for edit modal
	]);

	return {
		orgUnits: orgUnits.map((u) => ({
			...u,
			_id: u._id.toString(),
			parentId: u.parentId?.toString() || null,
			organizationId: u.organizationId?.toString() || null,
			managerId: u.managerId?.toString() || null
		})),
		organizationOptions,
		pagination: {
			page: params.page,
			pageSize: params.pageSize,
			total,
			totalPages: Math.ceil(total / params.pageSize)
		}
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const db = getDB();
		const formData = await request.formData();
		const unitId = formData.get('unitId') as string;

		if (!unitId) {
			return fail(400, { error: 'Unit ID is required' });
		}

		try {
			// Check if unit has children
			const hasChildren = await db.collection('org_units').countDocuments({
				parentId: new ObjectId(unitId)
			});

			if (hasChildren > 0) {
				return fail(400, { error: 'Cannot delete unit with children. Please delete or reassign child units first.' });
			}

			// Check if unit has employees assigned
			const hasEmployees = await db.collection('identities').countDocuments({
				identityType: 'employee',
				'employee.orgUnitId': new ObjectId(unitId)
			});

			if (hasEmployees > 0) {
				return fail(400, { error: 'Cannot delete unit with assigned employees. Please reassign employees first.' });
			}

			// Delete the unit
			const result = await db.collection('org_units').deleteOne({
				_id: new ObjectId(unitId)
			});

			if (result.deletedCount === 0) {
				return fail(404, { error: 'Unit not found' });
			}

			return { success: true };
		} catch (error) {
			console.error('Error deleting org unit:', error);
			return fail(500, { error: 'Failed to delete unit' });
		}
	}
};
