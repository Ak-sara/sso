import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { error, fail } from '@sveltejs/kit';
import { generateOrgStructureMermaid } from '$lib/utils/mermaid-generator';
import { serializeObjectIds } from '$lib/utils/serialize';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDB();

	try {
		// Get org structure version by ID (params.id is the version _id, not organization _id)
		const version = await db.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(params.id) });

		if (!version) {
			throw error(404, 'Organization structure version not found');
		}

		// Get organization using the version's organizationId
		const organization = await db.collection('organizations')
			.findOne({ _id: new ObjectId(version.organizationId) });

		if (!organization) {
			throw error(404, 'Organization not found');
		}

		return {
			organization: {
				_id: organization._id.toString(),
				code: organization.code,
				name: organization.name
			},
			version: serializeObjectIds(version)
		};
	} catch (err) {
		console.error('Load org structure STO error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to load organization structure');
	}
};

export const actions = {
	generateDefaultConfig: async ({ params }) => {
		const db = getDB();

		try {
			const version = await db.collection('org_structure_versions')
				.findOne({ _id: new ObjectId(params.id) });

			if (!version) {
				return fail(404, { error: 'Version not found' });
			}

			// Import the config builder
			const { buildDefaultMermaidConfig } = await import('$lib/utils/mermaid-config-builder');

			// Generate default config
			const config = buildDefaultMermaidConfig(version.structure.orgUnits);

			// Regenerate diagram with new config
			const mermaidDiagram = generateOrgStructureMermaid({
				...version,
				mermaidConfig: config
			} as any);

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

			return { success: true, message: 'Config generated successfully' };
		} catch (err) {
			console.error('Generate config error:', err);
			return fail(500, { error: 'Failed to generate config' });
		}
	},

	saveConfig: async ({ params, request }) => {
		const db = getDB();

		try {
			const formData = await request.formData();
			const configJson = formData.get('config') as string;

			if (!configJson) {
				return fail(400, { error: 'Config data is required' });
			}

			const config = JSON.parse(configJson);

			const version = await db.collection('org_structure_versions')
				.findOne({ _id: new ObjectId(params.id) });

			if (!version) {
				return fail(404, { error: 'Version not found' });
			}

			// Regenerate diagram with updated config
			const mermaidDiagram = generateOrgStructureMermaid({
				...version,
				mermaidConfig: config
			} as any);

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

			return { success: true, mermaidDiagram };
		} catch (err) {
			console.error('Save config error:', err);
			return fail(500, { error: 'Failed to save config' });
		}
	},

	regenerateMermaid: async ({ params }) => {
		const db = getDB();

		try {
			// Get version by ID (params.id is the version _id)
			const version = await db.collection('org_structure_versions')
				.findOne({ _id: new ObjectId(params.id) });

			if (!version) {
				return fail(404, { error: 'Organization structure version not found' });
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
