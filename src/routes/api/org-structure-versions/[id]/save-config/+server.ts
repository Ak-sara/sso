import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { json, error } from '@sveltejs/kit';
import { generateOrgStructureMermaid } from '$lib/utils/mermaid-generator';

// POST /api/org-structure-versions/[id]/save-config - Save mermaid config
export const POST: RequestHandler = async ({ params, request }) => {
	const db = getDB();

	try {
		const { config } = await request.json();

		if (!config) {
			throw error(400, 'Config data is required');
		}

		const version = await db.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(params.id) });

		if (!version) {
			throw error(404, 'Version not found');
		}

		console.log('Saving config:', JSON.stringify(config, null, 2));

		// Regenerate diagram with updated config
		const mermaidDiagram = generateOrgStructureMermaid({
			...version,
			mermaidConfig: config
		} as any);

		console.log('Generated mermaid diagram:');
		console.log(mermaidDiagram);

		// Update version
		await db.collection('org_structure_versions').updateOne(
			{ _id: version._id },
			{
				$set: {
					mermaidConfig: config,
					mermaidDiagram,
					updatedAt: new Date()
				}
			}
		);

		return json({ success: true, mermaidDiagram });
	} catch (err) {
		console.error('Save config error:', err);
		if (err instanceof Response) throw err;
		const errorMessage = err instanceof Error ? err.message : 'Failed to save config';
		throw error(500, errorMessage);
	}
};
