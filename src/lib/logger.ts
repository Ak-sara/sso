/**
 * Browser-safe logger for Svelte components.
 *
 * Svelte components must NOT import from @ak-sara/fbao/foundation directly,
 * because FBA's barrel re-exports server-only modules (mongodb, argon2, etc.)
 * which Vite tries to load in the browser and fails.
 *
 * Server-side code (.server.ts) can import useLogger from FBA directly.
 */

type Context = Record<string, unknown>;

class BrowserLogger {
	constructor(private context: Context = {}) {}

	child(ctx: Context): BrowserLogger {
		return new BrowserLogger({ ...this.context, ...ctx });
	}

	trace(msg: string, extra?: Context) { this.write('debug', msg, extra); }
	debug(msg: string, extra?: Context) { this.write('debug', msg, extra); }
	info(msg: string, extra?: Context)  { this.write('log', msg, extra); }
	warn(msg: string, extra?: Context)  { this.write('warn', msg, extra); }
	error(msg: string, extra?: Context) { this.write('error', msg, extra); }
	fatal(msg: string, extra?: Context) { this.write('error', msg, extra); }

	private write(level: 'debug' | 'log' | 'warn' | 'error', msg: string, extra?: Context) {
		const merged = { ...this.context, ...extra };
		const hasExtra = Object.keys(merged).length > 0;
		// eslint-disable-next-line no-console
		hasExtra ? console[level](msg, merged) : console[level](msg);
	}
}

let _instance: BrowserLogger | null = null;

export function useLogger(context?: Context): BrowserLogger {
	if (!_instance) _instance = new BrowserLogger();
	return context ? _instance.child(context) : _instance;
}
