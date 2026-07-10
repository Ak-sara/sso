import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { fail, error, redirect } from '@sveltejs/kit';
import { parseReassignmentCSV } from '$lib/utils/csv-parser';
import { getOrganizationById } from '$lib/services/organization-service';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (params.id === 'new') {
		// Create mode — no SK yet, just load directors
		const direktorPositions = await db.positions.find({ name: { $regex: /direktur/i } } as any);
		const direktorPosIds = direktorPositions.map((p: any) => p._id);
		const direktorPosMap = new Map(direktorPositions.map((p: any) => [p._id.toString(), p.name]));
		const directorIdentities = direktorPosIds.length > 0
			? await db.identities.find({ identityType: 'employee', employmentStatus: 'active', positionId: { $in: direktorPosIds } } as any)
			: [];
		const directors = (directorIdentities as any[]).map((emp) => ({
			employeeId: emp.employeeId, fullName: emp.fullName,
			positionName: direktorPosMap.get(emp.positionId?.toString()) || 'Unknown'
		}));
		return { sk: null, directors };
	}

	const sk = await db.skPenempatan.findById(params.id) as any;
	if (!sk) throw error(404, 'SK Penempatan tidak ditemukan');

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
		sk: { ...sk, _id: sk._id.toString(), organizationId: sk.organizationId?.toString() },
		directors
	};
};

async function buildReassignment(employee: any, formData: any, organizationId: any) {
	const prevOrgUnit = employee.orgUnitId
		? await db.orgUnits.findById(employee.orgUnitId.toString()) as any
		: null;
	const prevPosition = employee.positionId
		? await db.positions.findById(employee.positionId.toString()) as any
		: null;

	let newOrgUnit: any = null;
	let newPosition: any = null;

	if (formData?.newOrgUnitCode) {
		// 'logical' units are rendering-only containers, not real assignable units
		newOrgUnit = await db.orgUnits.findOne({ code: formData.newOrgUnitCode, organizationId, type: { $ne: 'logical' } } as any) as any;
		if (!newOrgUnit) throw new Error(`Unit kerja '${formData.newOrgUnitCode}' tidak ditemukan`);
	}
	if (formData?.newPositionCode) {
		newPosition = await db.positions.findOne({ code: formData.newPositionCode, organizationId } as any) as any;
		if (!newPosition) throw new Error(`Posisi '${formData.newPositionCode}' tidak ditemukan`);
	}

	return {
		employeeId: employee.employeeId,
		employeeName: employee.fullName,
		previousOrgUnitId: prevOrgUnit?._id.toString() || null,
		previousOrgUnitName: prevOrgUnit?.name || null,
		previousPositionId: prevPosition?._id.toString() || null,
		previousPositionName: prevPosition?.name || null,
		previousWorkLocation: employee.workLocation || null,
		newOrgUnitId: newOrgUnit?._id.toString() || employee.orgUnitId?.toString() || null,
		newOrgUnitName: newOrgUnit?.name || prevOrgUnit?.name || null,
		newPositionId: newPosition?._id.toString() || employee.positionId?.toString() || null,
		newPositionName: newPosition?.name || prevPosition?.name || null,
		newWorkLocation: formData?.newWorkLocation || employee.workLocation || null,
		newRegion: formData?.newRegion || employee.region || null,
		reason: formData?.reason || null,
		notes: formData?.notes || null,
		executed: false
	};
}

export const actions = {
	createSK: async ({ locals }) => {
		const formData = locals.body;
		const skNumber = formData?.skNumber;
		const skDate = formData?.skDate;
		const effectiveDate = formData?.effectiveDate;
		const signedBy = formData?.signedBy;

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
				skNumber, skDate: new Date(skDate),
				skTitle: formData?.skTitle || null,
				effectiveDate: new Date(effectiveDate),
				signedBy, signedByPosition: signatory?.positionId?.toString() || null,
				organizationId: organization._id, status: 'draft',
				reassignments: [], attachments: [], importedFromCSV: false,
				totalReassignments: 0, successfulReassignments: 0, failedReassignments: 0,
				description: formData?.description || null,
				requestedBy: 'system', requestedAt: new Date(), createdBy: 'system'
			} as any);

			throw redirect(303, `/organization/sk-penempatan/${(result as any)._id}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal membuat SK Penempatan' });
		}
	},

	updateSK: async ({ locals, params }) => {
		const formData = locals.body;
		const skNumber = formData?.skNumber;
		const skDate = formData?.skDate;
		const effectiveDate = formData?.effectiveDate;
		const signedBy = formData?.signedBy;

		if (!skNumber || !skDate || !effectiveDate || !signedBy) {
			return fail(400, { error: 'Field yang wajib diisi belum lengkap' });
		}

		try {
			const signatory = await db.identities.findOne({ employeeId: signedBy } as any) as any;
			await db.skPenempatan.updateById(params.id, {
				skNumber, skDate: new Date(skDate), effectiveDate: new Date(effectiveDate),
				signedBy, signedByPosition: signatory?.positionId?.toString() || null,
				skTitle: formData?.skTitle || null,
				description: formData?.description || null,
				updatedAt: new Date()
			} as any);
			return { success: true };
		} catch {
			return fail(500, { error: 'Gagal memperbarui SK' });
		}
	},

	upsertReassignment: async ({ locals, params }) => {
		const formData = locals.body;
		const index = formData?.index !== undefined ? Number(formData.index) : -1;
		const employeeId = formData?.employeeId;

		if (!employeeId) return fail(400, { error: 'NIK karyawan wajib diisi' });

		try {
			const sk = await db.skPenempatan.findById(params.id) as any;
			if (!sk) return fail(404, { error: 'SK Penempatan tidak ditemukan' });

			const employee = await db.identities.findOne({ employeeId } as any) as any;
			if (!employee) return fail(404, { error: `NIK ${employeeId} tidak ditemukan` });

			const reassignment = await buildReassignment(employee, formData, sk.organizationId);

			const reassignments = [...(sk.reassignments || [])];
			if (index >= 0 && index < reassignments.length) {
				reassignments[index] = { ...reassignment, executed: reassignments[index].executed ?? false };
			} else {
				reassignments.push(reassignment);
			}

			await db.skPenempatan.updateById(params.id, {
				reassignments, totalReassignments: reassignments.length, updatedAt: new Date()
			} as any);

			return { success: true };
		} catch (err: any) {
			const msg = err?.message || 'Gagal menyimpan data karyawan';
			return fail(msg.includes('tidak ditemukan') ? 404 : 500, { error: msg });
		}
	},

	deleteReassignment: async ({ locals, params }) => {
		const formData = locals.body;
		const index = formData?.index !== undefined ? Number(formData.index) : -1;

		if (index < 0) return fail(400, { error: 'Index wajib diisi' });

		try {
			const sk = await db.skPenempatan.findById(params.id) as any;
			if (!sk) return fail(404, { error: 'SK Penempatan tidak ditemukan' });

			const reassignments = [...(sk.reassignments || [])];
			if (index >= reassignments.length) return fail(400, { error: 'Index tidak valid' });
			reassignments.splice(index, 1);

			await db.skPenempatan.updateById(params.id, {
				reassignments, totalReassignments: reassignments.length, updatedAt: new Date()
			} as any);

			return { success: true };
		} catch {
			return fail(500, { error: 'Gagal menghapus data karyawan' });
		}
	},

	addReassignmentsCSV: async ({ locals, params }) => {
		const formData = locals.body;
		const csvFile = formData?.csvFile as File;
		if (!csvFile) return fail(400, { error: 'File CSV wajib diisi' });

		try {
			const sk = await db.skPenempatan.findById(params.id) as any;
			if (!sk) return fail(404, { error: 'SK Penempatan tidak ditemukan' });

			const csvContent = await csvFile.text();
			const parseResult = await parseReassignmentCSV(csvContent);
			if (!parseResult.success) return fail(400, { error: 'Error parsing CSV', errors: parseResult.errors });
			if (parseResult.data.length === 0) return fail(400, { error: 'File CSV tidak mengandung data' });

			const employeeIds = parseResult.data.map((row) => row.employeeId);
			const employees = await db.identities.find({ employeeId: { $in: employeeIds } } as any);
			const employeeMap = new Map((employees as any[]).map((e) => [e.employeeId, e]));

			const [orgUnits, positions] = await Promise.all([
				// 'logical' units are rendering-only containers, not real assignable units
				db.orgUnits.find({ organizationId: sk.organizationId, type: { $ne: 'logical' } } as any),
				db.positions.find({ organizationId: sk.organizationId } as any)
			]);
			const orgUnitMap = new Map((orgUnits as any[]).map((u) => [u.code, u]));
			const positionMap = new Map((positions as any[]).map((p) => [p.code, p]));

			const reassignments = [];
			const errors: string[] = [];

			for (const [i, row] of parseResult.data.entries()) {
				const employee = employeeMap.get(row.employeeId) as any;
				if (!employee) { errors.push(`Baris ${i + 2}: NIK ${row.employeeId} tidak ditemukan`); continue; }

				const prevOrgUnit = employee.orgUnitId ? await db.orgUnits.findById(employee.orgUnitId.toString()) as any : null;
				const prevPosition = employee.positionId ? await db.positions.findById(employee.positionId.toString()) as any : null;
				const newOrgUnit = row.newOrgUnitCode ? orgUnitMap.get(row.newOrgUnitCode) as any : null;
				const newPosition = row.newPositionCode ? positionMap.get(row.newPositionCode) as any : null;

				if (row.newOrgUnitCode && !newOrgUnit) { errors.push(`Baris ${i + 2}: Unit '${row.newOrgUnitCode}' tidak ditemukan`); continue; }
				if (row.newPositionCode && !newPosition) { errors.push(`Baris ${i + 2}: Posisi '${row.newPositionCode}' tidak ditemukan`); continue; }

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

			await db.skPenempatan.updateById(params.id, {
				reassignments, totalReassignments: reassignments.length,
				importedFromCSV: true, csvFilename: csvFile.name, csvImportedAt: new Date(), updatedAt: new Date()
			} as any);

			return { success: true, message: `${reassignments.length} karyawan berhasil diimport` };
		} catch {
			return fail(500, { error: 'Gagal mengimport CSV' });
		}
	}
} satisfies Actions;
