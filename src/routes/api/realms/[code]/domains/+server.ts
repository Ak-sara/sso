import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';

/**
 * GET /api/realms/[code]/domains
 * Get allowed email domains for a realm
 */
export const GET: RequestHandler = async ({ params }) => {
	const db = getDB();
	const org = await db.collection('organizations').findOne(
		{ code: params.code },
		{ projection: { allowedEmailDomains: 1, code: 1, name: 1 } }
	);

	if (!org) {
		return json({ error: 'Realm not found' }, { status: 404 });
	}

	return json({
		code: org.code,
		name: org.name,
		allowedEmailDomains: org.allowedEmailDomains || []
	});
};

/**
 * PUT /api/realms/[code]/domains
 * Update allowed email domains for a realm
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();
		const data = await request.json();

		// Validate that domains is an array of strings
		if (!Array.isArray(data.domains)) {
			return json({ error: 'domains must be an array' }, { status: 400 });
		}

		// Validate each domain format (supports wildcards like *.com)
		const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
		for (const domain of data.domains) {
			if (typeof domain !== 'string' || !domainRegex.test(domain)) {
				return json({ error: `Invalid domain format: ${domain}. Use format: example.com or *.com` }, { status: 400 });
			}
		}

		// Update the organization's allowed domains
		const result = await db.collection('organizations').updateOne(
			{ code: params.code },
			{
				$set: {
					allowedEmailDomains: data.domains,
					updatedAt: new Date()
				}
			}
		);

		if (result.matchedCount === 0) {
			return json({ error: 'Realm not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Email domains updated successfully',
			allowedEmailDomains: data.domains
		});
	} catch (error: any) {
		console.error('Error updating email domains:', error);
		return json({ error: error.message || 'Failed to update email domains' }, { status: 500 });
	}
};
