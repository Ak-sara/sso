import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { fail, redirect } from '@sveltejs/kit';
import { parseReassignmentCSV } from '$lib/utils/csv-parser';

export const load: PageServerLoad = async () => {
	const db = getDB();

	// Get organization (IAS for now)
	const organization = await db.collection('organizations').findOne({ code: 'IAS' });
	if (!organization) {
		throw new Error('Organization not found');
	}

	// Get all SK Penempatan
	const skList = await db
		.collection('sk_penempatan')
		.find({ organizationId: organization._id.toString() })
		.sort({ createdAt: -1 })
		.toArray();

	// Get directors for signatory dropdown
	const directors = await db
		.collection('employees')
		.aggregate([
			{
				$match: {
					positionId: { $exists: true },
					employmentStatus: 'active'
				}
			},
			{
				$lookup: {
					from: 'positions',
					localField: 'positionId',
					foreignField: '_id',
					as: 'position'
				}
			},
			{
				$match: {
					'position.name': { $regex: 'Direktur', $options: 'i' }
				}
			}
		])
		.toArray();

	return {
		skList: skList.map((sk) => ({
			...sk,
			_id: sk._id.toString()
		})),
		directors: directors.map((d) => ({
			employeeId: d.employeeId,
			fullName: d.fullName,
			positionName: d.position?.[0]?.name || 'Unknown'
		})),
		organizationId: organization._id.toString()
	};
};

export const actions = {
	create: async ({ request }) => {
		const db = getDB();
		const formData = await request.formData();

		const skNumber = formData.get('skNumber') as string;
		const skDate = formData.get('skDate') as string;
		const skTitle = formData.get('skTitle') as string;
		const effectiveDate = formData.get('effectiveDate') as string;
		const signedBy = formData.get('signedBy') as string;
		const description = formData.get('description') as string;

		if (!skNumber || !skDate || !effectiveDate || !signedBy) {
			return fail(400, { error: 'Field yang wajib diisi belum lengkap' });
		}

		try {
			// Get organization
			const organization = await db.collection('organizations').findOne({ code: 'IAS' });
			if (!organization) {
				return fail(404, { error: 'Organization not found' });
			}

			// Check if SK number already exists
			const existing = await db.collection('sk_penempatan').findOne({ skNumber });
			if (existing) {
				return fail(400, { error: `Nomor SK ${skNumber} sudah digunakan` });
			}

			// Get signatory details
			const signatory = await db.collection('employees').findOne({ employeeId: signedBy });

			// Create new SK
			const newSK = {
				skNumber,
				skDate: new Date(skDate),
				skTitle: skTitle || null,
				effectiveDate: new Date(effectiveDate),
				signedBy,
				signedByPosition: signatory?.positionId?.toString() || null,
				organizationId: organization._id.toString(),
				status: 'draft',
				reassignments: [],
				attachments: [],
				importedFromCSV: false,
				totalReassignments: 0,
				successfulReassignments: 0,
				failedReassignments: 0,
				description: description || null,
				requestedBy: 'system', // TODO: Get from session
				requestedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system'
			};

			const result = await db.collection('sk_penempatan').insertOne(newSK);

			// Redirect to edit page to add reassignments
			throw redirect(303, `/sk-penempatan/${result.insertedId}`);
		} catch (error) {
			console.error('Create SK error:', error);
			if (error instanceof Response) throw error;
			return fail(500, { error: 'Gagal membuat SK Penempatan' });
		}
	},

	importCSV: async ({ request }) => {
		const db = getDB();
		const formData = await request.formData();

		const skNumber = formData.get('skNumber') as string;
		const skDate = formData.get('skDate') as string;
		const effectiveDate = formData.get('effectiveDate') as string;
		const signedBy = formData.get('signedBy') as string;
		const csvFile = formData.get('csvFile') as File;

		if (!skNumber || !skDate || !effectiveDate || !signedBy || !csvFile) {
			return fail(400, { error: 'Semua field wajib diisi termasuk file CSV' });
		}

		try {
			// Get organization
			const organization = await db.collection('organizations').findOne({ code: 'IAS' });
			if (!organization) {
				return fail(404, { error: 'Organization not found' });
			}

			const orgId = organization._id;

			// Check if SK number already exists
			const existing = await db.collection('sk_penempatan').findOne({ skNumber });
			if (existing) {
				return fail(400, { error: `Nomor SK ${skNumber} sudah digunakan` });
			}

			// Read and parse CSV
			const csvContent = await csvFile.text();
			const parseResult = await parseReassignmentCSV(csvContent);

			if (!parseResult.success) {
				return fail(400, {
					error: 'Error parsing CSV',
					errors: parseResult.errors
				});
			}

			if (parseResult.data.length === 0) {
				return fail(400, { error: 'File CSV tidak mengandung data penempatan' });
			}

			// Get all employees to validate and enrich data
			const employeeIds = parseResult.data.map((row) => row.employeeId);
			const employees = await db
				.collection('employees')
				.find({ employeeId: { $in: employeeIds } })
				.toArray();

			const employeeMap = new Map(employees.map((e) => [e.employeeId, e]));

			// Get all org units and positions for code mapping
			const orgUnits = await db
				.collection('org_units')
				.find({ organizationId: orgId })
				.toArray();
			const positions = await db
				.collection('positions')
				.find({ organizationId: orgId })
				.toArray();

			const orgUnitMap = new Map(orgUnits.map((u) => [u.code, u]));
			const positionMap = new Map(positions.map((p) => [p.code, p]));

			// Process reassignments
			const reassignments = [];
			const errors: string[] = [];

			for (const [index, row] of parseResult.data.entries()) {
				const employee = employeeMap.get(row.employeeId);

				if (!employee) {
					errors.push(`Baris ${index + 2}: NIP ${row.employeeId} tidak ditemukan`);
					continue;
				}

				// Get previous assignment
				const previousOrgUnit = employee.orgUnitId
					? await db.collection('org_units').findOne({ _id: employee.orgUnitId })
					: null;
				const previousPosition = employee.positionId
					? await db.collection('positions').findOne({ _id: employee.positionId })
					: null;

				// Get new org unit
				const newOrgUnit = row.newOrgUnitCode ? orgUnitMap.get(row.newOrgUnitCode) : null;
				if (row.newOrgUnitCode && !newOrgUnit) {
					errors.push(
						`Baris ${index + 2}: Unit kerja '${row.newOrgUnitCode}' tidak ditemukan`
					);
					continue;
				}

				// Get new position
				const newPosition = row.newPositionCode ? positionMap.get(row.newPositionCode) : null;
				if (row.newPositionCode && !newPosition) {
					errors.push(`Baris ${index + 2}: Posisi '${row.newPositionCode}' tidak ditemukan`);
					continue;
				}

				reassignments.push({
					employeeId: employee.employeeId,
					employeeName: employee.fullName,
					previousOrgUnitId: previousOrgUnit?._id.toString() || null,
					previousOrgUnitName: previousOrgUnit?.name || null,
					previousPositionId: previousPosition?._id.toString() || null,
					previousPositionName: previousPosition?.name || null,
					previousWorkLocation: employee.workLocation || null,
					newOrgUnitId: newOrgUnit?._id.toString() || employee.orgUnitId?.toString() || null,
					newOrgUnitName: newOrgUnit?.name || previousOrgUnit?.name || null,
					newPositionId: newPosition?._id.toString() || employee.positionId?.toString() || null,
					newPositionName: newPosition?.name || previousPosition?.name || null,
					newWorkLocation: row.newWorkLocation || employee.workLocation || null,
					newRegion: row.newRegion || employee.region || null,
					reason: row.reason || null,
					notes: row.notes || null,
					executed: false
				});
			}

			if (errors.length > 0) {
				return fail(400, {
					error: 'Terdapat error saat memproses CSV',
					errors
				});
			}

			// Get signatory details
			const signatory = await db.collection('employees').findOne({ employeeId: signedBy });

			// Create SK with imported data
			const newSK = {
				skNumber,
				skDate: new Date(skDate),
				skTitle: `Import Penempatan dari ${csvFile.name}`,
				effectiveDate: new Date(effectiveDate),
				signedBy,
				signedByPosition: signatory?.positionId?.toString() || null,
				organizationId: organization._id.toString(),
				status: 'draft',
				reassignments,
				attachments: [],
				importedFromCSV: true,
				csvFilename: csvFile.name,
				csvImportedAt: new Date(),
				totalReassignments: reassignments.length,
				successfulReassignments: 0,
				failedReassignments: 0,
				description: `Imported from CSV: ${csvFile.name}`,
				requestedBy: 'system', // TODO: Get from session
				requestedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system'
			};

			const result = await db.collection('sk_penempatan').insertOne(newSK);

			// Redirect to detail page
			throw redirect(303, `/sk-penempatan/${result.insertedId}`);
		} catch (error) {
			console.error('Import CSV error:', error);
			if (error instanceof Response) throw error;
			return fail(500, { error: 'Gagal mengimport CSV' });
		}
	}
} satisfies Actions;
