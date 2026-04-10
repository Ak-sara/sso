import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	const { realmId } = locals.body as {realmId:any};

	if (!realmId || typeof realmId !== 'string') {
		return json({ error: 'realmId is required' }, { status: 400 });
	}

	// Validate realm exists
	const org = await db.organizations.findById(realmId);
	if (!org) {
		return json({ error: 'Realm not found' }, { status: 404 });
	}

	// Set cookie (30 days)
	cookies.set('active_realm', realmId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30,
	});

	return json({ success: true });
};
