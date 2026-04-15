/**
 * Generic formatting utilities for display values.
 */

/** Format an ISO date string for Indonesian locale display. Returns '-' for invalid/missing input. */
export function formatDate(value: string | Date | undefined | null): string {
	if (!value) return '-';
	try {
		return new Date(value).toLocaleDateString('id-ID', {
			year: 'numeric', month: 'long', day: 'numeric'
		});
	} catch { return '-'; }
}

/** Convert an array of objects into a key→value record for use as select options or lookup maps. */
export function datamap<T extends Record<string, any>>(
	data: T[],
	key: keyof T = '_id' as keyof T,
	value: keyof T = 'name' as keyof T
): Record<string, string> {
	const result: Record<string, string> = {};
	for (const item of data) result[String(item[key])] = String(item[value]);
	return result;
}
