export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

/**
 * Typed filter for MongoDB queries. Keys must be valid schema fields,
 * values allow any type (string, ObjectId, RegExp, $operators, etc.).
 */
export type MongoFilter<T> = Partial<Record<keyof T, any>> & Record<string, any>;

/**
 * Typed update payload. Same key-safety with flexible value types.
 */
export type MongoUpdate<T> = Partial<Record<keyof T, any>>;
