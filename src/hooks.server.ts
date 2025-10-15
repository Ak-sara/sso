import { connectDB } from '$lib/db/connection';
import { sessionManager } from '$lib/auth/session';
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
	return resolve(event);
};
