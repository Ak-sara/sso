import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { error, fail } from '@sveltejs/kit';
import { generateOrgStructureMermaid } from '$lib/utils/mermaid-generator';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDB();

	try {
		// Get organization
		const organization = await db.collection('organizations')
			.findOne({ _id: new ObjectId(params.id) });

		if (!organization) {
			throw error(404, 'Organization not found');
		}

		// Get active org structure version for this organization
		const version = await db.collection('org_structure_versions')
			.findOne({
				organizationId: params.id,
				status: 'active'
			});

		if (!version) {
			throw error(404, `No active organization structure version found for ${organization.name}`);
		}

		return {
			organization: {
				_id: organization._id.toString(),
				code: organization.code,
				name: organization.name
			},
			version: {
				...version,
				_id: version._id.toString(),
				mermaidDiagram: version.mermaidDiagram || ''
			}
		};
	} catch (err) {
		console.error('Load org structure STO error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to load organization structure');
	}
};

export const actions = {
	regenerateMermaid: async ({ params }) => {
		const db = getDB();

		try {
			// Get active version for this organization
			const version = await db.collection('org_structure_versions')
				.findOne({
					organizationId: params.id,
					status: 'active'
				});

			if (!version) {
				return fail(404, { error: 'No active organization structure version found' });
			}

			// Generate new Mermaid diagram from structure
			const mermaidDiagram = generateOrgStructureMermaid(version as any);

			// Update version with new diagram
			await db.collection('org_structure_versions').updateOne(
				{ _id: version._id },
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
