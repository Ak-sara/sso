import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';

// GET /api/realms/[code]/domains
export const GET: RequestHandler = async ({ params }) => {
	const org = await db.organizations.findOne({ code: params.code } as any) as any;
	if (!org) return json({ error: 'Realm not found' }, { status: 404 });

	return json({
		code: org.code,
		name: org.name,
		allowedEmailDomains: org.allowedEmailDomains || []
	});
};

// PUT /api/realms/[code]/domains
export const PUT: RequestHandler = async ({ params, locals }) => {
	try {
		const data = locals.body
		if (!Array.isArray(data?.domains)) return json({ error: 'domains must be an array' }, { status: 400 });

		const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
		for (const domain of data?.domains) {
			if (typeof domain !== 'string' || !domainRegex.test(domain)) {
				return json({ error: `Invalid domain format: ${domain}. Use format: example.com or *.com` }, { status: 400 });
			}
		}

		const updated = await db.organizations.updateOne(
			{ code: params.code } as any,
			{ allowedEmailDomains: data.domains } as any
		);
		if (!updated) return json({ error: 'Realm not found' }, { status: 404 });

		return json({ success: true, message: 'Email domains updated successfully', allowedEmailDomains: data.domains });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update email domains' }, { status: 500 });
	}
};
