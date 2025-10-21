import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const db = getDB();

	// Get sync history
	const syncHistory = await db.collection('sync_history')
		.find({})
		.sort({ timestamp: -1 })
		.limit(20)
		.toArray();

	// Mock comparison data for UI development
	const mockComparison = {
		stats: {
			total: 150,
			matches: 120,
			conflicts: 25,
			newRecords: 5
		},
		differences: [
			{
				id: '1',
				employeeName: 'Budi Santoso',
				employeeId: 'IAS-001',
				field: 'email',
				appValue: 'budi@ias.co.id',
				sourceValue: 'budi.santoso@ias.co.id',
				conflictType: 'value_mismatch'
			},
			{
				id: '2',
				employeeName: 'Budi Santoso',
				employeeId: 'IAS-001',
				field: 'phone',
				appValue: '081234567890',
				sourceValue: '081234567899',
				conflictType: 'value_mismatch'
			},
			{
				id: '3',
				employeeName: 'Siti Nurhaliza',
				employeeId: 'IAS-002',
				field: 'position',
				appValue: 'Manager',
				sourceValue: 'Senior Manager',
				conflictType: 'value_mismatch'
			},
			{
				id: '4',
				employeeName: 'Ahmad Wijaya',
				employeeId: 'IAS-003',
				field: 'orgUnit',
				appValue: 'Cargo Service',
				sourceValue: 'Cargo Operations',
				conflictType: 'value_mismatch'
			},
			{
				id: '5',
				employeeName: 'Dewi Lestari',
				employeeId: 'IAS-004',
				field: 'workLocation',
				appValue: 'CGK',
				sourceValue: 'DPS',
				conflictType: 'value_mismatch'
			}
		]
	};

	return {
		syncHistory: syncHistory.map(s => ({
			...s,
			_id: s._id.toString()
		})),
		mockComparison
	};
};

export const actions = {
	compareEntraID: async ({ request }) => {
		const db = getDB();
		// TODO: Implement actual Entra ID comparison
		// This would:
		// 1. Fetch data from Microsoft Graph API
		// 2. Compare with local database
		// 3. Return differences

		return { success: true };
	},

	compareCSV: async ({ request }) => {
		const db = getDB();
		const formData = await request.formData();
		const csvFile = formData.get('csvFile') as File;

		if (!csvFile) {
			return fail(400, { error: 'CSV file required' });
		}

		// TODO: Implement CSV parsing and comparison
		// This would:
		// 1. Parse CSV file
		// 2. Validate format
		// 3. Compare with local database
		// 4. Return differences

		return { success: true };
	},

	applyChanges: async ({ request }) => {
		const db = getDB();
		const formData = await request.formData();
		const changesJson = formData.get('changes') as string;
		const changes = JSON.parse(changesJson);

		// TODO: Implement change application
		// This would:
		// 1. Validate changes
		// 2. Apply changes to database
		// 3. Optionally sync back to Entra ID
		// 4. Log audit trail
		// 5. Create sync history entry

		try {
			// Log sync history
			await db.collection('sync_history').insertOne({
				timestamp: new Date(),
				source: formData.get('source') as string,
				changesApplied: changes.length,
				status: 'success',
				user: 'system', // TODO: Get from session
				details: changes
			});

			return { success: true, changesApplied: changes.length };
		} catch (error) {
			console.error('Apply changes error:', error);
			return fail(500, { error: 'Failed to apply changes' });
		}
	}
} satisfies Actions;
