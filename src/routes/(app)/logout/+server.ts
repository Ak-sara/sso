import { redirect } from '@sveltejs/kit';
import { sessionManager } from '$lib/auth/session';
import { logAuth } from '$lib/audit/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals, getClientAddress, request }) => {
	const identityId = locals.user?.userId?.toString();

	if (locals.session) {
		await sessionManager.deleteSession(locals.session.sessionId);
	}

	sessionManager.clearSessionCookie(cookies);

	// Log logout
	if (identityId) {
		await logAuth('logout', identityId, {
			ipAddress: getClientAddress(),
			userAgent: request.headers.get('user-agent') || undefined,
			email: locals.user?.email,
			username: locals.user?.username
		});
	}

	throw redirect(302, '/login');
};
