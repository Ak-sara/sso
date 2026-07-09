import { z, type ZodSchema } from 'zod';
import type { ServiceResult } from '$lib/services/types';

/**
 * Validates unknown input against a Zod schema.
 * Returns ServiceResult so callers can propagate errors uniformly.
 */
export function validateBody<T>(schema: ZodSchema<T>, input: unknown): ServiceResult<T> {
	const result = schema.safeParse(input);
	if (!result.success) {
		const message = result.error.issues.map((e) => e.message).join('; ');
		return { ok: false, error: message, status: 400 };
	}
	return { ok: true, data: result.data };
}

// ── Reusable field schemas ─────────────────────────────────────────────────

export const nonEmptyString = z.string().min(1, 'Field wajib diisi');
export const optionalString = z.string().optional();
export const emailField = z.string().email('Format email tidak valid').optional().or(z.literal(''));
export const booleanFromString = z
	.union([z.boolean(), z.string()])
	.transform((v) => v === true || v === 'true');
