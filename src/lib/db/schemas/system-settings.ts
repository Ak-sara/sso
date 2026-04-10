import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const SystemSettingsSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	key: z.string(),
	value: z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown())]),
	type: z.enum(['string', 'number', 'boolean', 'duration', 'json']),
	category: z.string().default('general'),
	label: z.string(),
	description: z.string().optional(),
	unit: z.string().optional(),
	updatedAt: z.date().default(() => new Date()),
	updatedBy: z.string().optional()
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;
