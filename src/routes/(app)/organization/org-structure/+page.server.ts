import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { fail, redirect } from '@sveltejs/kit';
import { versionManager } from '$lib/org-structure/version-manager';
import { serializeObjectIds } from '$lib/utils/serialize';
import { getOrganizationById } from '$lib/services/organization-service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.activeRealmId) throw new Error('No active realm selected');
	const orgResult = await getOrganizationById(locals.activeRealmId);
	if (!orgResult.ok) throw new Error('Organization not found');

	const versions = await db.orgStructureVersions.find(
		{ organizationId: orgResult.data._id } as any,
		{ versionNumber: -1 }
	);
	const currentVersion = versions.find((v: any) => v.status === 'active');

	return {
		versions: serializeObjectIds(versions),
		currentVersion: currentVersion ? serializeObjectIds(currentVersion) : null,
		organizationId: orgResult.data._id
	};
};

export const actions = {
	create: async ({ locals }) => {
		const formData = locals.body;
		const versionName = formData?.versionName;
		const effectiveDate = formData?.effectiveDate;
		const notes = formData?.notes;

		if (!versionName || !effectiveDate) return fail(400, { error: 'Version name and effective date are required' });

		try {
			if (!locals.activeRealmId) return fail(400, { error: 'No active realm selected' });
			const orgResult = await getOrganizationById(locals.activeRealmId);
			if (!orgResult.ok) return fail(404, { error: 'Organization not found' });
			const organization = orgResult.data;

			const versionId = await versionManager.createVersion(
				organization._id,
				versionName,
				new Date(effectiveDate),
				notes
			);

			throw redirect(303, `/org-structure/${versionId}`);
		} catch (err) {
			if (err instanceof Response) throw err;
			return fail(500, { error: 'Failed to create version' });
		}
	}
} satisfies Actions;
