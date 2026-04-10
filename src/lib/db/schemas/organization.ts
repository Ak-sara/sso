import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const OrganizationSchema = z.object({
	_id: z.custom<ObjectId>().optional(),
	code: z.string(), // IAS, IASS, IASG, etc
	name: z.string(),
	legalName: z.string().optional(),
	type: z.enum(['parent', 'subsidiary', 'branch', 'system']).default('subsidiary'),
	parentId: z.string().optional(), // Reference to parent organization
	description: z.string().optional(),
	logo: z.string().url().optional(),
	address: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email().optional(),
	website: z.string().url().optional(),
	taxId: z.string().optional(),
	isActive: z.boolean().default(true),
	settings: z.record(z.string(), z.any()).optional(),

	// Email domain whitelisting for self-registration
	allowedEmailDomains: z.array(z.string()).default([]),

	// Branding configuration (for white-labeling)
	branding: z.object({
		appName: z.string().optional(),
		logoBase64: z.string().optional(),
		faviconBase64: z.string().optional(),
		primaryColor: z.string().optional(),
		secondaryColor: z.string().optional(),
		accentColor: z.string().optional(),
		backgroundColor: z.string().optional(),
		textColor: z.string().optional(),
		loginBackgroundBase64: z.string().optional(),
		emailFromName: z.string().optional(),
		emailFromAddress: z.string().email().optional(),
		supportEmail: z.string().email().optional(),
		supportUrl: z.string().url().optional(),
	}).optional(),

	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// ── Domain helpers ──────────────────────────────────────────────────

import { db } from '../db';

export async function listOrganizationsWithUserCount(): Promise<Array<Organization & { userCount: number }>> {
	const orgs = await db.organizations.find({}, { name: 1 });
	return Promise.all(orgs.map(async (org) => ({
		...org,
		userCount: await db.identities.count({ organizationId: org._id!.toString() } as any)
	})));
}

export function orgHasUsers(code: string) {
	return db.identities.count({ 'customProperties.organizationCode': code } as any);
}

export function orgHasOrgUnits(code: string) {
	return db.orgUnits.count({ organization: code } as any);
}
