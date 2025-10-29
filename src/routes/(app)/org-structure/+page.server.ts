import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { fail, redirect } from '@sveltejs/kit';
import { generateOrgStructureMermaid } from '$lib/utils/mermaid-generator';

export const load: PageServerLoad = async ({ params, url }) => {
	const db = getDB();

	// Get organization ID (for now, default to IAS)
	const organization = await db.collection('organizations').findOne({ code: 'IAS' });
	if (!organization) {
		throw new Error('Organization not found');
	}

	// Get all versions for this organization
	const versions = await db.collection('org_structure_versions')
		.find({ organizationId: organization._id.toString() })
		.sort({ versionNumber: -1 })
		.toArray();

	// Get current active version
	const currentVersion = versions.find(v => v.status === 'active');

	return {
		versions: versions.map(v => ({
			...v,
			_id: v._id.toString()
		})),
		currentVersion: currentVersion ? {
			...currentVersion,
			_id: currentVersion._id.toString()
		} : null,
		organizationId: organization._id.toString()
	};
};

export const actions = {
	create: async ({ request }) => {
		const db = getDB();
		const formData = await request.formData();

		const versionName = formData.get('versionName') as string;
		const effectiveDate = formData.get('effectiveDate') as string;
		const notes = formData.get('notes') as string;

		if (!versionName || !effectiveDate) {
			return fail(400, { error: 'Version name and effective date are required' });
		}

		try {
			// Get organization (IAS for now)
			const organization = await db.collection('organizations').findOne({ code: 'IAS' });
			if (!organization) {
				return fail(404, { error: 'Organization not found' });
			}

			const orgId = organization._id.toString();

			// Get latest version number
			const latestVersion = await db.collection('org_structure_versions')
				.find({ organizationId: orgId })
				.sort({ versionNumber: -1 })
				.limit(1)
				.toArray();

			const nextVersionNumber = latestVersion.length > 0 ? latestVersion[0].versionNumber + 1 : 1;

			// Get current org structure (all org units and positions)
			const orgUnits = await db.collection('org_units')
				.find({ organizationId: new ObjectId(orgId) })
				.toArray();

			const positions = await db.collection('positions')
				.find({ organizationId: new ObjectId(orgId) })
				.toArray();

			// Create snapshot
			const structure = {
				orgUnits: orgUnits.map(u => ({
					_id: u._id.toString(),
					code: u.code,
					name: u.name,
					parentId: u.parentId?.toString(),
					type: u.type,
					level: u.level || 0,
					sortOrder: u.sortOrder || 0,
					headEmployeeId: u.managerId?.toString()
				})),
				positions: positions.map(p => ({
					_id: p._id.toString(),
					code: p.code,
					name: p.name,
					level: p.level,
					grade: p.grade || '',
					reportingToPositionId: null // TODO: Add this field to Position schema
				}))
			};

			// Generate Mermaid diagram
			const mermaidDiagram = generateOrgStructureMermaid({
				structure,
				versionNumber: nextVersionNumber
			} as any);

			// Create new version
			const newVersion = {
				versionNumber: nextVersionNumber,
				versionName,
				organizationId: orgId,
				effectiveDate: new Date(effectiveDate),
				status: 'draft',
				structure,
				changes: [],
				reassignments: [],
				skAttachments: [],
				mermaidDiagram, // Auto-generated diagram
				notes,
				createdBy: 'system', // TODO: Get from session
				createdAt: new Date(),
				updatedAt: new Date()
			};

			const result = await db.collection('org_structure_versions').insertOne(newVersion);

			// Redirect to edit page
			throw redirect(303, `/org-structure/${result.insertedId}`);
		} catch (error) {
			console.error('Create version error:', error);
			if (error instanceof Response) throw error;
			return fail(500, { error: 'Failed to create version' });
		}
	}
} satisfies Actions;
