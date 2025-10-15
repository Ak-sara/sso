import { redirect } from '@sveltejs/kit';
import { sessionManager } from '$lib/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	if (locals.session) {
		await sessionManager.deleteSession(locals.session.sessionId);
	}

	sessionManager.clearSessionCookie(cookies);

	throw redirect(302, '/login');
};
