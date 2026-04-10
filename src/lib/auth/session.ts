import { MongoSessionManager } from '@ak-sara/fbao/foundation';
import { getDB } from '$lib/db/connection';

export type { SessionData as Session } from '@ak-sara/fbao/foundation';

export const sessionManager = new MongoSessionManager(() => getDB(), {
	cookieName: 'aksara_session',
	maxAge: 24 * 60 * 60 * 1000,
	idleTimeout: 2 * 60 * 60 * 1000
});
