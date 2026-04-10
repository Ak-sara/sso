import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { fail, redirect } from '@sveltejs/kit';
import { parseReassignmentCSV } from '$lib/utils/csv-parser';
import { sanitizePaginationParams } from '$lib/utils/pagination';
import { ObjectId } from 'mongodb';
import { getOrganizationById } from '$lib/services/organization-service';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.activeRealmId) throw new Error('No active realm selected');
	const orgResult = await getOrganizationById(locals.activeRealmId);
	if (!orgResult.ok) throw new Error('Organization not found');
	const organization = orgResult.data;

	const params = sanitizePaginationParams({
		page: Number(locals.query?.page) || undefined,
		pageSize: Number(locals.query?.pageSize) || undefined,
		sortKey: locals.query?.sortKey || undefined,
		sortDirection: locals.query?.sortDirection as 'asc' | 'desc' | undefined,
		search: locals.query?.search || undefined
	});

	const orgId = organization._id;
	const result = await db.skPenempatan.findPaginated(
		params,
		{ organizationId: orgId } as any,
		['skNumber']
	);

	// Directors: find Direktur positions first, then match employees (avoids N+1)
	const direktorPositions = await db.positions.find({ name: { $regex: /direktur/i } } as any);
	const direktorPosIds = direktorPositions.map((p: any) => p._id);
	const direktorPosMap = new Map(direktorPositions.map((p: any) => [p._id.toString(), p.name]));

	const directorIdentities = direktorPosIds.length > 0
		? await db.identities.find({
			identityType: 'employee', employmentStatus: 'active',
			positionId: { $in: direktorPosIds }
		} as any)
		: [];

	const directors = (directorIdentities as any[]).map((emp) => ({
		employeeId: emp.employeeId,
		fullName: emp.fullName,
		positionName: direktorPosMap.get(emp.positionId?.toString()) || 'Unknown'
	}));

	return {
		skList: result.items.map((sk: any) => ({ ...sk, _id: sk._id.toString() })),
		directors,
		organizationId: orgId,
		pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages }
	};
};

export const actions = {
	create: async ({ locals }) => {
		const formData = locals.body
		const skNumber = formData?.skNumber;
		const skDate = formData?.skDate;
		const skTitle = formData?.skTitle;
		const effectiveDate = formData?.effectiveDate;
		const signedBy = formData?.signedBy;
		const description = formData?.description;

		if (!skNumber || !skDate || !effectiveDate || !signedBy) {
			return fail(400, { error: 'Field yang wajib diisi belum lengkap' });
		}

		try {
			if (!locals.activeRealmId) return fail(400, { error: 'No active realm selected' });
			const orgResult = await getOrganizationById(locals.activeRealmId);
			if (!orgResult.ok) return fail(404, { error: 'Organization not found' });
			const organization = orgResult.data;

			const existing = await db.skPenempatan.findOne({ skNumber } as any);
			if (existing) return fail(400, { error: `Nomor SK ${skNumber} sudah digunakan` });

			const signatory = await db.identities.findOne({ employeeId: signedBy } as any) as any;
			const result = await db.skPenempatan.insertOne({
				skNumber,
				skDate: new Date(skDate),
				skTitle: skTitle || null,
				effectiveDate: new Date(effectiveDate),
				signedBy,
				signedByPosition: signatory?.positionId?.toString() || null,
				organizationId: organization._id,
				status: 'draft',
				reassignments: [],
				attachments: [],
				importedFromCSV: false,
				totalReassignments: 0,
				successfulReassignments: 0,
				failedReassignments: 0,
				description: description || null,
				requestedBy: 'system',
				requestedAt: new Date(),
				createdBy: 'system'
			} as any);

			throw redirect(303, `/sk-penempatan/${(result as any)._id}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal membuat SK Penempatan' });
		}
	},

	importCSV: async ({ locals }) => {
		const formData = locals.body
		const skNumber = formData?.skNumber;
		const skDate = formData?.skDate;
		const effectiveDate = formData?.effectiveDate;
		const signedBy = formData?.signedBy;
		const csvFile = formData?.csvFile as File;

		if (!skNumber || !skDate || !effectiveDate || !signedBy || !csvFile) {
			return fail(400, { error: 'Semua field wajib diisi termasuk file CSV' });
		}

		try {
			if (!locals.activeRealmId) return fail(400, { error: 'No active realm selected' });
			const orgResult = await getOrganizationById(locals.activeRealmId);
			if (!orgResult.ok) return fail(404, { error: 'Organization not found' });
			const organization = orgResult.data;

			const existing = await db.skPenempatan.findOne({ skNumber } as any);
			if (existing) return fail(400, { error: `Nomor SK ${skNumber} sudah digunakan` });

			const csvContent = await csvFile.text();
			const parseResult = await parseReassignmentCSV(csvContent);
			if (!parseResult.success) return fail(400, { error: 'Error parsing CSV', errors: parseResult.errors });
			if (parseResult.data.length === 0) return fail(400, { error: 'File CSV tidak mengandung data penempatan' });

			const employeeIds = parseResult.data.map((row) => row.employeeId);
			const employees = await db.identities.find({ employeeId: { $in: employeeIds } } as any);
			const employeeMap = new Map((employees as any[]).map((e) => [e.employeeId, e]));

			const orgUnits = await db.orgUnits.find({ organizationId: organization._id } as any);
			const positions = await db.positions.find({ organizationId: organization._id } as any);
			const orgUnitMap = new Map((orgUnits as any[]).map((u) => [u.code, u]));
			const positionMap = new Map((positions as any[]).map((p) => [p.code, p]));

			const reassignments = [];
			const errors: string[] = [];

			for (const [index, row] of parseResult.data.entries()) {
				const employee = employeeMap.get(row.employeeId) as any;
				if (!employee) { errors.push(`Baris ${index + 2}: NIK ${row.employeeId} tidak ditemukan`); continue; }

				const prevOrgUnit = employee.orgUnitId ? await db.orgUnits.findById(employee.orgUnitId.toString()) as any : null;
				const prevPosition = employee.positionId ? await db.positions.findById(employee.positionId.toString()) as any : null;
				const newOrgUnit = row.newOrgUnitCode ? orgUnitMap.get(row.newOrgUnitCode) as any : null;
				const newPosition = row.newPositionCode ? positionMap.get(row.newPositionCode) as any : null;

				if (row.newOrgUnitCode && !newOrgUnit) { errors.push(`Baris ${index + 2}: Unit kerja '${row.newOrgUnitCode}' tidak ditemukan`); continue; }
				if (row.newPositionCode && !newPosition) { errors.push(`Baris ${index + 2}: Posisi '${row.newPositionCode}' tidak ditemukan`); continue; }

				reassignments.push({
					employeeId: employee.employeeId, employeeName: employee.fullName,
					previousOrgUnitId: prevOrgUnit?._id.toString() || null, previousOrgUnitName: prevOrgUnit?.name || null,
					previousPositionId: prevPosition?._id.toString() || null, previousPositionName: prevPosition?.name || null,
					previousWorkLocation: employee.workLocation || null,
					newOrgUnitId: newOrgUnit?._id.toString() || employee.orgUnitId?.toString() || null,
					newOrgUnitName: newOrgUnit?.name || prevOrgUnit?.name || null,
					newPositionId: newPosition?._id.toString() || employee.positionId?.toString() || null,
					newPositionName: newPosition?.name || prevPosition?.name || null,
					newWorkLocation: row.newWorkLocation || employee.workLocation || null,
					newRegion: row.newRegion || employee.region || null,
					reason: row.reason || null, notes: row.notes || null, executed: false
				});
			}

			if (errors.length > 0) return fail(400, { error: 'Terdapat error saat memproses CSV', errors });

			const signatory = await db.identities.findOne({ employeeId: signedBy } as any) as any;
			const result = await db.skPenempatan.insertOne({
				skNumber, skDate: new Date(skDate),
				skTitle: `Import Penempatan dari ${csvFile.name}`,
				effectiveDate: new Date(effectiveDate),
				signedBy, signedByPosition: signatory?.positionId?.toString() || null,
				organizationId: organization._id, status: 'draft',
				reassignments, attachments: [], importedFromCSV: true,
				csvFilename: csvFile.name, csvImportedAt: new Date(),
				totalReassignments: reassignments.length, successfulReassignments: 0, failedReassignments: 0,
				description: `Imported from CSV: ${csvFile.name}`,
				requestedBy: 'system', requestedAt: new Date(), createdBy: 'system'
			} as any);

			throw redirect(303, `/sk-penempatan/${(result as any)._id}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal mengimport CSV' });
		}
	}
} satisfies Actions;
