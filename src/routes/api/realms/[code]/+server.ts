import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	const org = await db.organizations.findOne({ code: params.code } as any) as any;
	if (!org) throw error(404, 'Realm not found');

	const userCount = await db.identities.count({ organizationId: org._id.toString() } as any);

	return json({
		...org,
		_id: org._id.toString(),
		parentId: org.parentId?.toString() || null,
		userCount,
		allowedEmailDomains: org.allowedEmailDomains || []
	});
};

export const PUT: RequestHandler = async ({ locals }) => {
	try {
		const data = locals.body
		if (!data?.name) return json({ error: 'Realm name is required' }, { status: 400 });

		const update: any = {
			name: data.name,
			legalName: data.legalName || data.name,
			type: data.type || 'subsidiary',
			description: data.description || '',
			isActive: data.isActive !== undefined ? data.isActive : true
		};
		if (data.allowedEmailDomains !== undefined) update.allowedEmailDomains = Array.isArray(data.allowedEmailDomains) ? data.allowedEmailDomains : [];
		if (data.branding !== undefined) update.branding = data.branding;

		const updated = await db.organizations.updateOne({ code: locals.routes.code } as any, update);
		if (!updated) throw error(404, 'Realm not found');

		return json({ success: true, message: 'Realm updated successfully' });
	} catch (err: any) {
		if (err instanceof Response) throw err;
		return json({ error: err.message || 'Failed to update realm' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals }) => {
	try {
		const org = await db.organizations.findOne({ code: locals.routes.code } as any) as any;
		if (!org) throw error(404, 'Realm not found');

		const userCount = await db.identities.count({ organizationId: org._id.toString() } as any);
		if (userCount > 0) throw error(400, `Cannot delete realm. It has ${userCount} user(s).`);

		const orgUnitCount = await db.orgUnits.count({ organizationId: org._id.toString() } as any);
		if (orgUnitCount > 0) throw error(400, `Cannot delete realm. It has ${orgUnitCount} organizational unit(s).`);

		await db.organizations.deleteOne({ code: locals.routes.code } as any);
		return json({ success: true, message: 'Realm deleted successfully' });
	} catch (err: any) {
		if (err instanceof Response) throw err;
		return json({ error: err.message || 'Failed to delete realm' }, { status: 500 });
	}
};
