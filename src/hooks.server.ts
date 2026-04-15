import { setupFBA } from '$lib/setup';
import '$lib/auth/roles';
import { connectDB } from '$lib/db/connection';
import { sessionManager } from '$lib/auth/session';
import { extractRequestMetadata, logAudit } from '$lib/audit/logger';
import { sequence } from '@sveltejs/kit/hooks';
import { sanitizeObject, createSanitizeHook, createRateLimitHook, useLogger } from '@ak-sara/fbao/foundation';
import type { Handle } from '@sveltejs/kit';

const log = useLogger({ module: 'hooks' });

// Connect to database on server startup
let dbConnected = false;

async function ensureDBConnection() {
	if (!dbConnected) {
		try {
			const { env } = await import('$env/dynamic/private');
			setupFBA({ MONGODB_URI: env.MONGODB_URI!, MONGODB_DB: env.MONGODB_DB! });
			await connectDB(env.MONGODB_URI!, env.MONGODB_DB!);
			dbConnected = true;
		} catch (error) {
			log.error('Failed to connect to database', { error });
			throw error;
		}
	}
}

// Hooks read windowMs/maxRequests/excludePaths from config automatically
const sanitizeHook = createSanitizeHook(); /* HTML/XSS stripping, sql_injection, trimming whitespace, type coercion */
const rateLimitHook = createRateLimitHook({ exclude: ['/.well-known/'] });

const mainHandle: Handle = async ({ event, resolve }) => {
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

	// Read active realm cookie (lightweight, separate from auth session)
	const activeRealmCookie = event.cookies.get('active_realm');
	event.locals.activeRealmId = activeRealmCookie || event.locals.user?.organizationId || undefined;

	/* inputs params */
	let [Method,Headers,contentType,query]=[
		event.request.method,
		event.request.headers,
		event.request.headers.get('content-type') || '',
		Object.fromEntries(event.url.searchParams.entries()),
	];
	let bodyParams: Record<string, unknown> = {};
	if (!['GET', 'HEAD'].includes(Method)) {
		if (contentType.includes('application/json')) {
			bodyParams = await event.request.json();
		} else if (contentType.includes('form')) {
			const formData = await event.request.formData();
			bodyParams = Object.fromEntries(formData.entries());
		}
	}
	event.locals.headers= Headers;
	event.locals.method= Method;
	event.locals.routes= sanitizeObject(event.params, { html: true });
	event.locals.query= sanitizeObject(query, { html: true });
	event.locals.body= sanitizeObject(bodyParams, { html: true }) ?? {};

	event.locals.vars = {
		content_type:contentType,
		authorization: Headers.get('Authorization') || '',
		content_length: Headers.get('content-length') || '',
		user_agent: Headers.get('user-agent') || '',
	};
	/* end:inputs params */

	// Continue with request
	const response = await resolve(event);

	// Audit logging for failed access attempts
	if (response.status === 401 || response.status === 403) {
		const identityId = event.locals.user?.userId?.toString();

		// Log access denied event
		await logAudit({ action: 'access_denied', resource: 'sessions', identityId, status: 'denied', details: { resource: event.url.pathname, reason: response.status === 401 ? 'Unauthorized' : 'Forbidden' }, organizationId: event.locals.user?.organizationId, ...requestMetadata });
	}
	return response;
};

export const handle = sequence(sanitizeHook, rateLimitHook, mainHandle);

