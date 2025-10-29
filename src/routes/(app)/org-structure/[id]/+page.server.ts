import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDB();

	try {
		const version = await db.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(params.id) });

		if (!version) {
			throw error(404, 'Version not found');
		}

		// Get all directors for SK signatory dropdown
		const directors = await db.collection('indentities')
			.find({
				positionId: { $exists: true },
				employmentStatus: 'active'
			})
			.toArray();

		// Get position names for directors
		const directorsWithPositions = await Promise.all(directors.map(async (dir) => {
			const position = await db.collection('positions').findOne({ _id: new ObjectId(dir.positionId) });
			return {
				employeeId: dir.employeeId,
				fullName: dir.fullName,
				positionName: position?.name || 'Unknown'
			};
		}));

		// Get linked SK Penempatan (employee assignment decrees related to this org structure version)
		const linkedSKPenempatan = await db.collection('sk_penempatan')
			.find({ orgStructureVersionId: params.id })
			.sort({ createdAt: -1 })
			.toArray();

		// Aggregate all employees affected from all SK Penempatan
		const aggregatedReassignments: any[] = [];
		let totalAffectedEmployees = 0;

		for (const sk of linkedSKPenempatan) {
			if (sk.reassignments && Array.isArray(sk.reassignments)) {
				for (const reassignment of sk.reassignments) {
					aggregatedReassignments.push({
						...reassignment,
						skPenempatanId: sk._id.toString(),
						skNumber: sk.skNumber
					});
					totalAffectedEmployees++;
				}
			}
		}

		return {
			version: {
				...version,
				_id: version._id.toString(),
				skAttachments: version.skAttachments || [],
				reassignments: version.reassignments || [],
				changes: version.changes || []
			},
			directors: directorsWithPositions.filter(d => d.positionName.includes('Direktur')),
			linkedSKPenempatan: linkedSKPenempatan.map(sk => ({
				...sk,
				_id: sk._id.toString()
			})),
			aggregatedReassignments,
			totalAffectedEmployees
		};
	} catch (err) {
		console.error('Load version error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to load version');
	}
};

export const actions = {
	updateSK: async ({ request, params }) => {
		const db = getDB();
		const formData = await request.formData();

		const skNumber = formData.get('skNumber') as string;
		const skDate = formData.get('skDate') as string;
		const skSignedBy = formData.get('skSignedBy') as string;

		try {
			await db.collection('org_structure_versions').updateOne(
				{ _id: new ObjectId(params.id) },
				{
					$set: {
						skNumber,
						skDate: skDate ? new Date(skDate) : null,
						skSignedBy,
						updatedAt: new Date()
					}
				}
			);

			return { success: true };
		} catch (err) {
			console.error('Update SK error:', err);
			return fail(500, { error: 'Failed to update SK information' });
		}
	},

	submitApproval: async ({ params }) => {
		const db = getDB();

		try {
			// Check if SK information is complete
			const version = await db.collection('org_structure_versions')
				.findOne({ _id: new ObjectId(params.id) });

			if (!version) {
				return fail(404, { error: 'Version not found' });
			}

			if (!version.skNumber || !version.skDate) {
				return fail(400, { error: 'SK number and date are required before submitting for approval' });
			}

			// Update status
			await db.collection('org_structure_versions').updateOne(
				{ _id: new ObjectId(params.id) },
				{
					$set: {
						status: 'pending_approval',
						updatedAt: new Date()
					}
				}
			);

			// TODO: Send notification to approvers

			return { success: true };
		} catch (err) {
			console.error('Submit approval error:', err);
			return fail(500, { error: 'Failed to submit for approval' });
		}
	},

	approve: async ({ params }) => {
		const db = getDB();

		try {
			const version = await db.collection('org_structure_versions')
				.findOne({ _id: new ObjectId(params.id) });

			if (!version) {
				return fail(404, { error: 'Version not found' });
			}

			if (version.status !== 'pending_approval') {
				return fail(400, { error: 'Only pending versions can be approved' });
			}

			// Deactivate current active version
			await db.collection('org_structure_versions').updateMany(
				{
					organizationId: version.organizationId,
					status: 'active'
				},
				{
					$set: {
						status: 'archived',
						endDate: new Date(),
						updatedAt: new Date()
					}
				}
			);

			// Activate this version
			await db.collection('org_structure_versions').updateOne(
				{ _id: new ObjectId(params.id) },
				{
					$set: {
						status: 'active',
						approvedBy: 'system', // TODO: Get from session
						approvedAt: new Date(),
						updatedAt: new Date()
					}
				}
			);

			// Apply reassignments to employees
			if (version.reassignments && version.reassignments.length > 0) {
				for (const reassignment of version.reassignments) {
					await db.collection('employees').updateOne(
						{ employeeId: reassignment.employeeId },
						{
							$set: {
								orgUnitId: reassignment.newOrgUnitId ? new ObjectId(reassignment.newOrgUnitId) : null,
								positionId: reassignment.newPositionId ? new ObjectId(reassignment.newPositionId) : null,
								updatedAt: new Date()
							}
						}
					);

					// Create employee history entry
					await db.collection('employee_history').insertOne({
						employeeId: new ObjectId(reassignment.employeeId),
						eventType: 'org_restructure',
						eventDate: version.effectiveDate,
						organizationId: reassignment.newOrgUnitId ? new ObjectId(reassignment.newOrgUnitId) : null,
						orgUnitId: reassignment.newOrgUnitId ? new ObjectId(reassignment.newOrgUnitId) : null,
						positionId: reassignment.newPositionId ? new ObjectId(reassignment.newPositionId) : null,
						details: {
							versionId: params.id,
							versionNumber: version.versionNumber,
							skNumber: version.skNumber,
							reason: reassignment.reason,
							previousOrgUnitId: reassignment.oldOrgUnitId,
							previousPositionId: reassignment.oldPositionId
						},
						createdAt: new Date(),
						createdBy: 'system'
					});
				}
			}

			// TODO: Send notification to affected employees
			// TODO: Trigger SCIM sync to update connected apps

			return { success: true };
		} catch (err) {
			console.error('Approve version error:', err);
			return fail(500, { error: 'Failed to approve version' });
		}
	},

	createSKPenempatan: async ({ params, request }) => {
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
			const version = await db.collection('org_structure_versions')
				.findOne({ _id: new ObjectId(params.id) });

			if (!version) {
				return fail(404, { error: 'Version not found' });
			}

			// Check if SK number already exists
			const existing = await db.collection('sk_penempatan').findOne({ skNumber });
			if (existing) {
				return fail(400, { error: `Nomor SK ${skNumber} sudah digunakan` });
			}

			// Get signatory details
			const signatory = await db.collection('indentities').findOne({ employeeId: signedBy });
			const signatoryPosition = signatory?.positionId
				? await db.collection('positions').findOne({ _id: new ObjectId(signatory.positionId) })
				: null;

			// Create SK Penempatan linked to this version
			const newSK = {
				skNumber,
				skDate: new Date(skDate),
				skTitle: skTitle || `Penempatan Karyawan - ${version.versionName}`,
				effectiveDate: new Date(effectiveDate),
				signedBy,
				signedByPosition: signatoryPosition?.name || null,
				organizationId: version.organizationId,
				orgStructureVersionId: params.id, // Link to org structure version
				status: 'draft',
				reassignments: [], // Empty initially, will be filled via CSV import or manual entry
				attachments: [],
				importedFromCSV: false,
				totalReassignments: 0,
				successfulReassignments: 0,
				failedReassignments: 0,
				description: description || `SK Penempatan terkait ${version.versionName}`,
				notes: `Created from Org Structure Version ${version.versionNumber}`,
				requestedBy: 'system', // TODO: Get from session
				requestedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system'
			};

			const result = await db.collection('sk_penempatan').insertOne(newSK);

			// Redirect to SK Penempatan detail to add employees
			throw redirect(303, `/sk-penempatan/${result.insertedId}`);
		} catch (err) {
			console.error('Create SK Penempatan error:', err);
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Gagal membuat SK Penempatan' });
		}
	}
} satisfies Actions;
