/**
 * Parses a JSON-array form field submitted as a hidden-input string
 * (e.g. multi-select components that do `JSON.stringify(value)`).
 *
 * `hooks.server.ts` runs every request body through `sanitizeObject(..., { html: true })`,
 * which HTML-escapes all strings — turning the JSON-stringified array's `"` into
 * `&quot;`. That corrupts the JSON before it can be parsed, so this undoes it first.
 */
export function parseJsonArrayField(value: unknown, fallback: string[] = []): string[] {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === 'string' && value) {
		try {
			const parsed = JSON.parse(value.replaceAll('&quot;', '"'));
			return Array.isArray(parsed) ? parsed.map(String) : fallback;
		} catch {
			return fallback;
		}
	}
	return fallback;
}
