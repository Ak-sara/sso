import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { error, fail } from '@sveltejs/kit';
import { parseReassignmentCSV } from '$lib/utils/csv-parser';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDB();

	try {
		const sk = await db.collection('sk_penempatan')
			.findOne({ _id: new ObjectId(params.id) });

		if (!sk) {
			throw error(404, 'SK Penempatan not found');
		}

		// Get organization
		const organization = await db.collection('organizations')
			.findOne({ _id: new ObjectId(sk.organizationId) });

		// Get linked org structure version (if any)
		let orgStructureVersion = null;
		if (sk.orgStructureVersionId) {
			orgStructureVersion = await db.collection('org_structure_versions')
				.findOne({ _id: new ObjectId(sk.orgStructureVersionId) });
		}

		// Get directors for signatory dropdown
		const directors = await db.collection('indentities')
			.find({
				positionId: { $exists: true },
				employmentStatus: 'active'
			})
			.toArray();

		const directorsWithPositions = await Promise.all(directors.map(async (dir) => {
			const position = await db.collection('positions').findOne({ _id: new ObjectId(dir.positionId) });
			return {
				employeeId: dir.employeeId,
				fullName: dir.fullName,
				positionName: position?.name || 'Unknown'
			};
		}));

		return {
			sk: {
				...sk,
				_id: sk._id.toString(),
				organizationId: sk.organizationId?.toString(),
				orgStructureVersionId: sk.orgStructureVersionId?.toString()
			},
			organization: organization ? {
				...organization,
				_id: organization._id.toString()
			} : null,
			orgStructureVersion: orgStructureVersion ? {
				...orgStructureVersion,
				_id: orgStructureVersion._id.toString()
			} : null,
			directors: directorsWithPositions.filter(d => d.positionName.includes('Direktur'))
		};
	} catch (err) {
		console.error('Load SK Penempatan error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to load SK Penempatan');
	}
};

export const actions = {
	updateSK: async ({ params, request }) => {
		const db = getDB();
		const formData = await request.formData();

		const skNumber = formData.get('skNumber') as string;
		const skDate = formData.get('skDate') as string;
		const skTitle = formData.get('skTitle') as string;
		const effectiveDate = formData.get('effectiveDate') as string;
		const signedBy = formData.get('signedBy') as string;
		const description = formData.get('description') as string;

		try {
			const updateData: any = {
				updatedAt: new Date()
			};

			if (skNumber) updateData.skNumber = skNumber;
			if (skDate) updateData.skDate = new Date(skDate);
			if (skTitle) updateData.skTitle = skTitle;
			if (effectiveDate) updateData.effectiveDate = new Date(effectiveDate);
			if (signedBy) updateData.signedBy = signedBy;
			if (description) updateData.description = description;

			await db.collection('sk_penempatan').updateOne(
				{ _id: new ObjectId(params.id) },
				{ $set: updateData }
			);

			return { success: true };
		} catch (err) {
			console.error('Update SK error:', err);
			return fail(500, { error: 'Failed to update SK' });
		}
	},

	importCSV: async ({ params, request }) => {
		const db = getDB();
		const formData = await request.formData();
		const csvFile = formData.get('csvFile') as File;

		if (!csvFile) {
			return fail(400, { error: 'File CSV tidak ditemukan' });
		}

		try {
			const sk = await db.collection('sk_penempatan')
				.findOne({ _id: new ObjectId(params.id) });

			if (!sk) {
				return fail(404, { error: 'SK Penempatan not found' });
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

			// Get organization
			const organization = await db.collection('organizations')
				.findOne({ _id: new ObjectId(sk.organizationId) });

			if (!organization) {
				return fail(404, { error: 'Organization not found' });
			}

			// Get all employees to validate and enrich data
			const employeeIds = parseResult.data.map((row) => row.employeeId);
			const employees = await db.collection('employees')
				.find({ employeeId: { $in: employeeIds } })
				.toArray();

			const employeeMap = new Map(employees.map((e) => [e.employeeId, e]));

			// Get all org units and positions for code mapping
			const orgUnits = await db.collection('org_units')
				.find({ organizationId: organization._id })
				.toArray();
			const positions = await db.collection('positions')
				.find({ organizationId: organization._id })
				.toArray();

			const orgUnitMap = new Map(orgUnits.map((u) => [u.code, u]));
			const positionMap = new Map(positions.map((p) => [p.code, p]));

			// Process reassignments
			const reassignments = [];
			const errors: string[] = [];

			for (const [index, row] of parseResult.data.entries()) {
				const employee = employeeMap.get(row.employeeId);

				if (!employee) {
					errors.push(`Baris ${index + 2}: NIK ${row.employeeId} tidak ditemukan`);
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

			// Update SK with new reassignments
			await db.collection('sk_penempatan').updateOne(
				{ _id: new ObjectId(params.id) },
				{
					$set: {
						reassignments,
						totalReassignments: reassignments.length,
						importedFromCSV: true,
						csvFilename: csvFile.name,
						csvImportedAt: new Date(),
						updatedAt: new Date()
					}
				}
			);

			return { success: true, message: `${reassignments.length} karyawan berhasil diimport` };
		} catch (err) {
			console.error('Import CSV error:', err);
			return fail(500, { error: 'Gagal mengimport CSV' });
		}
	}
} satisfies Actions;
