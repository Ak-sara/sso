import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listPositions, createPosition, deletePosition } from '$lib/services/position-service';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:pagination');
	const filter: Record<string, any> = {};
	if (locals.activeRealmId) filter.organizationId = locals.activeRealmId;
	return { positions: await listPositions(filter) };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const formData = locals.body;
		const result = await createPosition({
			code: formData?.code,
			name: formData?.name,
			grade: formData?.grade || '',
			level: formData?.level as any,
			description: formData?.description || '',
			isActive: true,
			organizationId: locals.activeRealmId || formData?.organizationId || '',
			responsibilities: [],
			requirements: [],
		});
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: 'Position created successfully' };
	},

	delete: async ({ locals }) => {
		const formData = locals.body;
		const code = formData?.code;
		if (!code) return fail(400, { error: 'Position code is required' });
		const result = await deletePosition(code);
		if (!result.ok) return fail(result.status || 400, { error: result.error });
		return { success: 'Position deleted successfully' };
	}
};
