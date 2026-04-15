import { redirect } from '@sveltejs/kit';
import { sessionManager } from '$lib/auth/session';
import { logAudit } from '$lib/audit/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals, getClientAddress }) => {
	const identityId = locals.user?.userId?.toString();

	if (locals.session) {
		await sessionManager.deleteSession(locals.session.sessionId);
	}

	sessionManager.clearSessionCookie(cookies);

	// Log logout
	if (identityId) {
		await logAudit({ action: 'logout', resource: 'sessions', identityId, details: { email: locals.user?.email, username: locals.user?.username }, ipAddress: getClientAddress(), userAgent: locals.vars.user_agent || undefined });
	}

	throw redirect(302, '/login');
};
