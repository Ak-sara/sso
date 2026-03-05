import { ObjectId } from 'mongodb';

/**
 * Recursively converts all ObjectId instances to strings and Date objects to ISO strings.
 * This is necessary for SvelteKit's load functions to return serializable data.
 *
 * @param obj - Any object, array, or primitive value
 * @returns The same structure with all ObjectIds and Dates converted to strings
 *
 * @example
 * ```typescript
 * const data = {
 *   _id: new ObjectId(),
 *   createdAt: new Date(),
 *   parentId: new ObjectId()
 * };
 * const serialized = serializeObjectIds(data);
 * // Returns: {
 * //   _id: "507f1f77bcf86cd799439011",
 * //   createdAt: "2025-10-30T10:00:00.000Z",
 * //   parentId: "507f191e810c19729de860ea"
 * // }
 * ```
 */
export function serializeObjectIds(obj: any): any {
	if (obj === null || obj === undefined) return obj;

	// Handle ObjectId
	if (obj instanceof ObjectId) {
		return obj.toString();
	}

	// Handle Date - convert to ISO string (only if valid)
	if (obj instanceof Date) {
		// Check if date is valid
		if (!isNaN(obj.getTime())) {
			return obj.toISOString();
		}
		return null; // Invalid date becomes null
	}

	// Handle Arrays
	if (Array.isArray(obj)) {
		return obj.map(item => serializeObjectIds(item));
	}

	// Handle plain objects (not special types)
	// Check for object type but not for special constructors
	if (typeof obj === 'object') {
		const result: any = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = serializeObjectIds(value);
		}
		return result;
	}

	return obj;
}
