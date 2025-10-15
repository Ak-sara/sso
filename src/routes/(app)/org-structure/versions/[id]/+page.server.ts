import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { error, fail } from '@sveltejs/kit';
import { generateOrgStructureMermaid } from '$lib/utils/mermaid-generator';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDB();

	try {
		const version = await db.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(params.id) });

		if (!version) {
			throw error(404, 'Version not found');
		}

		// Get all directors for SK signatory dropdown
		const directors = await db.collection('employees')
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

		return {
			version: {
				...version,
				_id: version._id.toString()
			},
			directors: directorsWithPositions.filter(d => d.positionName.includes('Direktur'))
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

	regenerateMermaid: async ({ params }) => {
		const db = getDB();

		try {
			const version = await db.collection('org_structure_versions')
				.findOne({ _id: new ObjectId(params.id) });

			if (!version) {
				return fail(404, { error: 'Version not found' });
			}

			// Generate new Mermaid diagram from structure
			const mermaidDiagram = generateOrgStructureMermaid(version as any);

			// Update version with new diagram
			await db.collection('org_structure_versions').updateOne(
				{ _id: new ObjectId(params.id) },
				{
					$set: {
						mermaidDiagram,
						updatedAt: new Date()
					}
				}
			);

			return { success: true, mermaidDiagram };
		} catch (err) {
			console.error('Regenerate Mermaid error:', err);
			return fail(500, { error: 'Failed to regenerate diagram' });
		}
	}
} satisfies Actions;
