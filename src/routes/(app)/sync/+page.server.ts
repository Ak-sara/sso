import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { identityRepository } from '$lib/db/identity-repository';
import type { Identity } from '$lib/db/schemas';

export const load: PageServerLoad = async ({ url }) => {
	const tab = url.searchParams.get('tab') || 'csv';

	return {
		currentTab: tab
	};
};

export const actions: Actions = {
	uploadCSV: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return fail(400, { error: 'No file uploaded' });
		}

		try {
			// Read CSV content
			const content = await file.text();
			const lines = content.split('\n').filter(line => line.trim());

			if (lines.length === 0) {
				return fail(400, { error: 'CSV file is empty' });
			}

			// Parse CSV header
			const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

			// Parse CSV rows
			const rows = lines.slice(1).map(line => {
				const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
				const row: Record<string, string> = {};
				headers.forEach((header, index) => {
					row[header] = values[index] || '';
				});
				return row;
			});

			// Preview: Check what will be created vs updated
			const preview = {
				toCreate: [] as Array<Partial<Identity>>,
				toUpdate: [] as Array<{ identity: Identity; changes: Partial<Identity> }>,
				warnings: [] as Array<{ row: any; warning: string }>,
				errors: [] as Array<{ row: any; error: string }>
			};

			for (const row of rows) {
				// Required fields
				const nik = row.NIK || row.nik || row.employeeId;
				const firstName = row.FirstName || row.firstName || row.first_name;
				const lastName = row.LastName || row.lastName || row.last_name;

				if (!nik) {
					preview.errors.push({ row, error: 'NIK is required' });
					continue;
				}

				if (!firstName || !lastName) {
					preview.errors.push({ row, error: 'FirstName and LastName are required' });
					continue;
				}

				// Check if identity exists
				const existing = await identityRepository.findByEmployeeId(nik);

				const email = row.Email || row.email;
				const orgUnit = row.OrgUnit || row.orgUnit || row.org_unit;
				const position = row.Position || row.position;
				const employmentType = (row.EmploymentType || row.employmentType || row.employment_type || 'permanent').toLowerCase() as any;
				const workLocation = row.WorkLocation || row.workLocation || row.work_location;

				if (existing) {
					// Will update
					const changes: Partial<Identity> = {};

					if (email && email !== existing.email) changes.email = email;
					if (firstName !== existing.firstName) changes.firstName = firstName;
					if (lastName !== existing.lastName) changes.lastName = lastName;
					changes.fullName = `${firstName} ${lastName}`;

					// Only add to update list if there are actual changes
					if (Object.keys(changes).length > 1) { // > 1 because fullName is always set
						preview.toUpdate.push({ identity: existing, changes });
					}
				} else {
					// Will create
					const newIdentity: Partial<Identity> = {
						identityType: 'employee',
						username: email || nik,
						email: email || undefined,
						firstName,
						lastName,
						fullName: `${firstName} ${lastName}`,
						employeeId: nik,
						employmentType,
						employmentStatus: 'active',
						isActive: true, // Active by default
						roles: ['user'],
						joinDate: new Date(),
						workLocation,
						secondaryAssignments: [],
						customProperties: {}
					};

					preview.toCreate.push(newIdentity);

					// Warning if no email
					if (!email) {
						preview.warnings.push({
							row,
							warning: `No email provided for ${firstName} ${lastName} - NIK will be used as username`
						});
					}
				}
			}

			return {
				success: true,
				preview
			};

		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	},

	applyImport: async ({ request }) => {
		const formData = await request.formData();
		const previewData = formData.get('previewData');

		if (!previewData) {
			return fail(400, { error: 'No preview data provided' });
		}

		try {
			const preview = JSON.parse(previewData as string);
			let created = 0;
			let updated = 0;
			const errors: string[] = [];

			// Create new identities
			for (const identity of preview.toCreate) {
				try {
					await identityRepository.create({
						...identity,
						organizationId: identity.organizationId || 'default-org-id', // TODO: Get from session
						password: 'temp-password-hash', // TODO: Generate temp password
						isActive: true,
						emailVerified: false,
						createdAt: new Date(),
						updatedAt: new Date()
					});
					created++;
				} catch (error: any) {
					errors.push(`Failed to create ${identity.fullName}: ${error.message}`);
				}
			}

			// Update existing identities
			for (const update of preview.toUpdate) {
				try {
					await identityRepository.updateById(update.identity._id, update.changes);
					updated++;
				} catch (error: any) {
					errors.push(`Failed to update ${update.identity.fullName}: ${error.message}`);
				}
			}

			return {
				success: true,
				message: `Successfully imported: ${created} created, ${updated} updated`,
				stats: { created, updated, errors }
			};

		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	}
};
