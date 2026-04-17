import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { error, fail, redirect } from '@sveltejs/kit';
import { versionPublisher } from '$lib/org-structure/publisher';
import { serializeObjectIds } from '$lib/utils/serialize';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const version = await db.orgStructureVersions.findById(params.id) as any;
		if (!version) throw error(404, 'Version not found');

		const [direktorPositions, linkedSKPenempatan] = await Promise.all([
			db.positions.find({ name: { $regex: /direktur/i } } as any),
			db.skPenempatan.find(
				{ orgStructureVersionId: params.id } as any,
				{ createdAt: -1 }
			)
		]);

		const direktorPosIds = direktorPositions.map((p: any) => p._id);
		const direktorPosMap = new Map(direktorPositions.map((p: any) => [p._id.toString(), p.name]));

		const directorIdentities = direktorPosIds.length > 0
			? await db.identities.find({
				employmentStatus: 'active',
				positionId: { $in: direktorPosIds }
			} as any)
			: [];

		const directorsWithPositions = (directorIdentities as any[]).map((dir) => ({
			employeeId: dir.employeeId,
			fullName: dir.fullName,
			positionName: direktorPosMap.get(dir.positionId?.toString()) || 'Unknown'
		}));

		const aggregatedReassignments: any[] = [];
		for (const sk of linkedSKPenempatan as any[]) {
			if (Array.isArray(sk.reassignments)) {
				for (const r of sk.reassignments) {
					aggregatedReassignments.push({ ...r, skPenempatanId: sk._id.toString(), skNumber: sk.skNumber });
				}
			}
		}

		return {
			version: serializeObjectIds(version),
			directors: directorsWithPositions,
			linkedSKPenempatan: serializeObjectIds(linkedSKPenempatan),
			aggregatedReassignments: serializeObjectIds(aggregatedReassignments),
			totalAffectedEmployees: aggregatedReassignments.length
		};
	} catch (err) {
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to load version');
	}
};

export const actions = {
	updateSK: async ({ locals }) => {
		const formData = locals.body
		const skNumber = formData?.skNumber;
		const skDate = formData?.skDate;
		const skSignedBy = formData?.skSignedBy;

		try {
			await db.orgStructureVersions.updateById(locals.routes.id as string, {
				skNumber,
				skDate: skDate ? new Date(skDate) : null,
				skSignedBy
			} as any);
			return { success: true };
		} catch {
			return fail(500, { error: 'Failed to update SK information' });
		}
	},

	publish: async ({ params }) => {
		try {
			const result = await versionPublisher.publishVersion(params.id);
			if (!result.success) return fail(500, { error: result.error });
			return { success: true, message: result.message };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to publish version' });
		}
	},

	resumePublish: async ({ locals }) => {
		try {
			const result = await versionPublisher.resumePublish(locals.routes.id as string);
			if (!result.success) return fail(500, { error: result.error });
			return { success: true, message: result.message };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to resume publish' });
		}
	},

	createSKPenempatan: async ({ locals }) => {
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
			const version = await db.orgStructureVersions.findById(locals.routes.id as string) as any;
			if (!version) return fail(404, { error: 'Version not found' });

			const existing = await db.skPenempatan.findOne({ skNumber } as any);
			if (existing) return fail(400, { error: `Nomor SK ${skNumber} sudah digunakan` });

			const signatory = await db.identities.findOne({ employeeId: signedBy } as any) as any;
			const signatoryPosition = signatory?.positionId
				? await db.positions.findById(signatory.positionId.toString()) as any
				: null;

			const insertId = await db.skPenempatan.insertOne({
				skNumber,
				skDate: new Date(skDate),
				skTitle: skTitle || `Penempatan Karyawan - ${version.versionName}`,
				effectiveDate: new Date(effectiveDate),
				signedBy,
				signedByPosition: signatoryPosition?.name || null,
				organizationId: version.organizationId,
				orgStructureVersionId: locals.routes.id,
				status: 'draft',
				reassignments: [],
				attachments: [],
				importedFromCSV: false,
				totalReassignments: 0,
				successfulReassignments: 0,
				failedReassignments: 0,
				description: description || `SK Penempatan terkait ${version.versionName}`,
				notes: `Created from Org Structure Version ${version.versionNumber}`,
				requestedBy: 'system',
				requestedAt: new Date(),
				createdBy: 'system'
			} as any);

			throw redirect(303, `/organization/sk-penempatan/${(insertId as any)._id}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal membuat SK Penempatan' });
		}
	}
} satisfies Actions;
