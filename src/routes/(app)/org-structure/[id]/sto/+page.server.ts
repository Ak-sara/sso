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

		// If this is the ACTIVE version, load LIVE data from org_units collection
		// Otherwise, use the snapshot from version.structure
		let orgUnits;
		if (version.status === 'active') {
			console.log('🔴 Loading LIVE data for active version');
			const liveUnits = await db.collection('org_units')
				.find({
					organizationId: new ObjectId(version.organizationId),
					isActive: true
				})
				.sort({ level: 1, sortOrder: 1 })
				.toArray();

			orgUnits = liveUnits.map(unit => ({
				_id: unit._id.toString(),
				code: unit.code,
				name: unit.name,
				shortName: unit.shortName || '',
				type: unit.type,
				level: unit.level || 0,
				sortOrder: unit.sortOrder || 0,
				parentId: unit.parentId?.toString() || null,
				managerId: unit.managerId?.toString() || null,
				description: unit.description || ''
			}));

			// Regenerate mermaid diagram with live data
			const liveVersion = {
				...version,
				structure: { orgUnits }
			};
			const mermaidDiagram = generateOrgStructureMermaid(liveVersion as any);

			// Update version with latest diagram (but don't update structure snapshot)
			await db.collection('org_structure_versions').updateOne(
				{ _id: version._id },
				{
					$set: {
						mermaidDiagram,
						updatedAt: new Date()
					}
				}
			);

			version.mermaidDiagram = mermaidDiagram;
			version.structure.orgUnits = orgUnits;
		} else {
			console.log('📸 Using snapshot data for non-active version');
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

			// If active version, load live data from org_units
			let orgUnits = version.structure.orgUnits;
			if (version.status === 'active') {
				console.log('🔴 Generating config with LIVE data for active version');
				const liveUnits = await db.collection('org_units')
					.find({
						organizationId: new ObjectId(version.organizationId),
						isActive: true
					})
					.sort({ level: 1, sortOrder: 1 })
					.toArray();

				orgUnits = liveUnits.map(unit => ({
					_id: unit._id.toString(),
					code: unit.code,
					name: unit.name,
					shortName: unit.shortName || '',
					type: unit.type,
					level: unit.level || 0,
					sortOrder: unit.sortOrder || 0,
					parentId: unit.parentId?.toString() || null,
					managerId: unit.managerId?.toString() || null,
					description: unit.description || ''
				}));
			}

			// Import the config builder
			const { buildDefaultMermaidConfig } = await import('$lib/utils/mermaid-config-builder');

			// Generate default config
			const config = buildDefaultMermaidConfig(orgUnits);
			console.log('Generated config:', JSON.stringify(config, null, 2));

			// Regenerate diagram with new config
			const mermaidDiagram = generateOrgStructureMermaid({
				...version,
				structure: { orgUnits },
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

			return { success: true, message: 'Config generated successfully' };
		} catch (err) {
			console.error('Generate config error:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to generate config';
			return fail(500, { error: errorMessage });
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

			console.log('Saving config:', JSON.stringify(config, null, 2));

			// If active version, load live data from org_units
			let versionToRender = version;
			if (version.status === 'active') {
				console.log('🔴 Saving config with LIVE data for active version');
				const liveUnits = await db.collection('org_units')
					.find({
						organizationId: new ObjectId(version.organizationId),
						isActive: true
					})
					.sort({ level: 1, sortOrder: 1 })
					.toArray();

				const orgUnits = liveUnits.map(unit => ({
					_id: unit._id.toString(),
					code: unit.code,
					name: unit.name,
					shortName: unit.shortName || '',
					type: unit.type,
					level: unit.level || 0,
					sortOrder: unit.sortOrder || 0,
					parentId: unit.parentId?.toString() || null,
					managerId: unit.managerId?.toString() || null,
					description: unit.description || ''
				}));

				versionToRender = {
					...version,
					structure: { orgUnits }
				};
			}

			// Regenerate diagram with updated config
			const mermaidDiagram = generateOrgStructureMermaid({
				...versionToRender,
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

			return { success: true, mermaidDiagram };
		} catch (err) {
			console.error('Save config error:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to save config';
			return fail(500, { error: errorMessage });
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

			// If active version, load live data from org_units
			let versionToRender = version;
			if (version.status === 'active') {
				console.log('🔴 Regenerating with LIVE data for active version');
				const liveUnits = await db.collection('org_units')
					.find({
						organizationId: new ObjectId(version.organizationId),
						isActive: true
					})
					.sort({ level: 1, sortOrder: 1 })
					.toArray();

				const orgUnits = liveUnits.map(unit => ({
					_id: unit._id.toString(),
					code: unit.code,
					name: unit.name,
					shortName: unit.shortName || '',
					type: unit.type,
					level: unit.level || 0,
					sortOrder: unit.sortOrder || 0,
					parentId: unit.parentId?.toString() || null,
					managerId: unit.managerId?.toString() || null,
					description: unit.description || ''
				}));

				versionToRender = {
					...version,
					structure: { orgUnits }
				};
			}

			// Generate new Mermaid diagram from structure
			const mermaidDiagram = generateOrgStructureMermaid(versionToRender as any);

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
