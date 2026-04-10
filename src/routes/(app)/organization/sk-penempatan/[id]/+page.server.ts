import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { error, fail } from '@sveltejs/kit';
import { parseReassignmentCSV } from '$lib/utils/csv-parser';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const sk = await db.skPenempatan.findById(params.id) as any;
		if (!sk) throw error(404, 'SK Penempatan not found');

		const [organization, orgStructureVersion] = await Promise.all([
			db.organizations.findById(sk.organizationId) as any,
			sk.orgStructureVersionId ? db.orgStructureVersions.findById(sk.orgStructureVersionId) : null
		]);

		const directors = await db.identities.find(
			{ identityType: 'employee', employmentStatus: 'active', positionId: { $exists: true } } as any
		);
		const directorsWithPositions = await Promise.all((directors as any[]).map(async (dir) => {
			const position = dir.positionId ? await db.positions.findById(dir.positionId.toString()) as any : null;
			return { employeeId: dir.employeeId, fullName: dir.fullName, positionName: position?.name || 'Unknown' };
		}));

		return {
			sk: { ...sk, _id: sk._id.toString(), organizationId: sk.organizationId?.toString(), orgStructureVersionId: sk.orgStructureVersionId?.toString() },
			organization: organization ? { ...(organization as any), _id: (organization as any)._id.toString() } : null,
			orgStructureVersion: orgStructureVersion ? { ...(orgStructureVersion as any), _id: (orgStructureVersion as any)._id.toString() } : null,
			directors: directorsWithPositions.filter(d => d.positionName.includes('Direktur'))
		};
	} catch (err) {
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to load SK Penempatan');
	}
};

export const actions = {
	updateSK: async ({ locals }) => {
		const formData = locals.body
		try {
			const updateData: any = {};
			const skNumber = formData?.skNumber;
			const skDate = formData?.skDate;
			const skTitle = formData?.skTitle;
			const effectiveDate = formData?.effectiveDate;
			const signedBy = formData?.signedBy;
			const description = formData?.description;

			if (skNumber) updateData.skNumber = skNumber;
			if (skDate) updateData.skDate = new Date(skDate);
			if (skTitle) updateData.skTitle = skTitle;
			if (effectiveDate) updateData.effectiveDate = new Date(effectiveDate);
			if (signedBy) updateData.signedBy = signedBy;
			if (description) updateData.description = description;

			await db.skPenempatan.updateById(locals.routes.id as string, updateData);
			return { success: true };
		} catch {
			return fail(500, { error: 'Failed to update SK' });
		}
	},

	importCSV: async ({ locals }) => {
		const formData = locals.body
		const csvFile = formData?.csvFile as File;
		if (!csvFile) return fail(400, { error: 'File CSV tidak ditemukan' });

		try {
			const sk = await db.skPenempatan.findById(locals.routes.id as string) as any;
			if (!sk) return fail(404, { error: 'SK Penempatan not found' });

			const csvContent = await csvFile.text();
			const parseResult = await parseReassignmentCSV(csvContent);
			if (!parseResult.success) return fail(400, { error: 'Error parsing CSV', errors: parseResult.errors });
			if (parseResult.data.length === 0) return fail(400, { error: 'File CSV tidak mengandung data penempatan' });

			const organization = await db.organizations.findById(sk.organizationId) as any;
			if (!organization) return fail(404, { error: 'Organization not found' });

			const employeeIds = parseResult.data.map((row) => row.employeeId);
			const employees = await db.identities.find({ employeeId: { $in: employeeIds } } as any);
			const employeeMap = new Map((employees as any[]).map((e) => [e.employeeId, e]));

			const [orgUnits, positions] = await Promise.all([
				db.orgUnits.find({ organizationId: organization._id } as any),
				db.positions.find({ organizationId: organization._id } as any)
			]);
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

			await db.skPenempatan.updateById(locals.routes.id as string, {
				reassignments, totalReassignments: reassignments.length,
				importedFromCSV: true, csvFilename: csvFile.name, csvImportedAt: new Date()
			} as any);

			return { success: true, message: `${reassignments.length} karyawan berhasil diimport` };
		} catch (err) {
			return fail(500, { error: 'Gagal mengimport CSV' });
		}
	}
} satisfies Actions;
