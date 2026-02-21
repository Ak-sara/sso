import { connectDB } from '$lib/db/connection';
import { sessionManager } from '$lib/auth/session';
import { extractRequestMetadata, logAccessControl } from '$lib/audit/logger';
import type { Handle } from '@sveltejs/kit';

// Connect to database on server startup
let dbConnected = false;

async function ensureDBConnection() {
	if (!dbConnected) {
		try {
			await connectDB();
			dbConnected = true;
		} catch (error) {
			console.error('Failed to connect to database:', error);
			throw error;
		}
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Ensure database is connected
	await ensureDBConnection();

	// Extract request metadata (IP, user agent) for audit logging
	const requestMetadata = extractRequestMetadata(event);
	event.locals.audit = requestMetadata;

	// Disable CSRF protection for OAuth endpoints (they use client credentials instead)
	if (event.url.pathname.startsWith('/oauth/') || event.url.pathname.startsWith('/.well-known/')) {
		const response = await resolve(event, {
			filterSerializedResponseHeaders: (name) => name === 'content-type'
		});
		return response;
	}

	// Check for session
	const sessionId = sessionManager.getSessionCookie(event.cookies);

	if (sessionId) {
		const session = await sessionManager.getSession(sessionId);
		if (session) {
			event.locals.user = {
				userId: session.userId,
				email: session.email,
				username: session.username,
				firstName: session.firstName,
				lastName: session.lastName,
				roles: session.roles,
				organizationId: session.organizationId,
			};
			event.locals.session = session;
		}
	}

	// Continue with request
	const response = await resolve(event);

	// Audit logging for failed access attempts
	if (response.status === 401 || response.status === 403) {
		const identityId = event.locals.user?.userId?.toString();

		// Log access denied event
		await logAccessControl(
			'access_denied',
			identityId,
			{
				resource: event.url.pathname,
				reason: response.status === 401 ? 'Unauthorized' : 'Forbidden',
				...requestMetadata,
				organizationId: event.locals.user?.organizationId
			}
		);
	}

	return response;
};
