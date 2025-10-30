import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail, redirect } from '@sveltejs/kit';
import { versionManager } from '$lib/org-structure/version-manager';
import { serializeObjectIds } from '$lib/utils/serialize';

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
		versions: serializeObjectIds(versions),
		currentVersion: currentVersion ? serializeObjectIds(currentVersion) : null,
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

			// Use VersionManager to create version with snapshot
			const versionId = await versionManager.createVersion(
				orgId,
				versionName,
				new Date(effectiveDate),
				notes
			);

			// Redirect to edit page
			throw redirect(303, `/org-structure/${versionId}`);
		} catch (error) {
			console.error('Create version error:', error);
			if (error instanceof Response) throw error;
			return fail(500, { error: 'Failed to create version' });
		}
	}
} satisfies Actions;
