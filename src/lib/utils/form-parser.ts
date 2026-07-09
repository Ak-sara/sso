import { z } from 'zod';
import { sanitizeObject } from '@ak-sara/fbao/foundation/sanitize';

/**
 * Coerce a raw FormData string to the correct JS type based on the Zod field schema.
 * Unwraps ZodOptional / ZodDefault before checking the inner type.
 */
function coerceField(value: string, schema: z.ZodTypeAny): unknown {
	let inner: z.ZodTypeAny = schema;
	while (inner instanceof z.ZodOptional || inner instanceof z.ZodDefault)
		inner = inner.unwrap() as z.ZodTypeAny;

	if (inner instanceof z.ZodNumber)  return Number(value) || 0;
	if (inner instanceof z.ZodBoolean) return value === 'true';
	return value || undefined;
}

/**
 * Parse a FormData into a partial typed object driven by a Zod schema,
 * then sanitize all string values (trim + strip MongoDB $ operators).
 *
 * Only keys present in both the schema shape and the FormData are included,
 * so the result is safe to spread into a create or update operation.
 *
 * @example
 * const unit = fromForm<OrgUnit>(OrgUnitSchema, formData);
 * unit.organizationId = locals.activeRealmId; // apply business logic
 * await createOrgUnit(unit as OrgUnit);
 */
export function fromForm<T>(schema: z.ZodObject<any>, f: Record<string, any>): Partial<T> {
	const raw: Record<string, unknown> = {};
	for (const [key, fieldSchema] of Object.entries(schema.shape)) {
		if(Object.keys(f).includes(key)) raw[key] = coerceField(f[key] as string, fieldSchema as z.ZodTypeAny);
	}
	return raw as Partial<T>;
}
