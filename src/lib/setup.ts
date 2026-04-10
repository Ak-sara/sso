import { configure } from '@ak-sara/fbao/foundation';

export function setupFBA(env: { MONGODB_URI: string; MONGODB_DB: string }) {
	configure({
		mongo: {
			url: env.MONGODB_URI,
			database: env.MONGODB_DB,
		},
		auth: {
			mode: 'credentials',
		},
		logger: {
			level: 'info',
			transports: [{ type: 'console', pretty: true }],
		},
		sanitize: {
			excludePaths: ['/oauth/', '/.well-known/'],
		},
		rateLimit: {
			windowMs: 60_000,
			maxRequests: 200,
			store: 'memory',
		},
	});
}
