import { configure, useLogger } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'setup' });

export function setupFBA(env: { MONGODB_URI: string; MONGODB_DB: string; REDIS_URL?: string }) {
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
		// BullMQ (Redis) when REDIS_URL is set, MemoryAdapter otherwise
		queue: env.REDIS_URL ? { url: env.REDIS_URL } : {},
	});
	log.info(`Queue adapter: ${env.REDIS_URL ? `BullMQ (${env.REDIS_URL})` : 'MemoryAdapter (no REDIS_URL)'}`);
}
