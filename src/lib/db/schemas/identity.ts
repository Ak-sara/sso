import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const IdentitySchema = z.object({
	_id: z.custom<ObjectId>().optional(),

	// === CORE IDENTITY (ALL TYPES) ===
	identityType: z.enum(['employee', 'partner', 'external', 'service_account']),

	// Login credentials
	email: z.string().email().optional(), // Optional (employees may not have email)
	password: z.string(), // Hashed with argon2

	// Status
	isActive: z.boolean().default(true), // true = can login, false = account disabled
	emailVerified: z.boolean().default(false),
	roles: z.array(z.string()).default(['user']), // user, admin, hr, manager, etc

	// Personal info (ALL types)
	firstName: z.string(),
	lastName: z.string(),
	fullName: z.string(),
	phone: z.string().optional(),
	avatar: z.string().url().optional(),

	// Demographics
	dateOfBirth: z.date().optional(),
	gender: z.enum(['male', 'female', 'other']).optional(),
	nationality: z.string().optional(), 
	idNumber: z.string().optional(), // KTP
	taxId: z.string().optional(), // NPWP
	personalEmail: z.string().email().optional(),

	// Organization context / Assignment
	employeeId: z.string().optional(), // NIK - UNIQUE, can be used as username
	organizationId: z.string(), // Which realm/org this identity belongs to
	orgUnitId: z.string().optional(), // Department/division
	positionId: z.string().optional(), // Job title
	
	workLocation: z.string().optional(), // CGK, DPS, etc
	region: z.string().optional(),
	isRemote: z.boolean().optional(),

	joinDate: z.date().optional(),
	endDate: z.date().optional(), // For PKWT/contract
	probationEndDate: z.date().optional(),

	// Employment details
	employmentType: z.enum(['permanent', 'pkwt', 'outsource', 'contract']).optional(),
	employmentStatus: z.enum(['active', 'probation', 'terminated', 'resigned']).optional(),

	// assignments (multi-company)
	assignments: z.array(
		z.object({
			_id: z.custom<ObjectId>(),
			
			organizationId: z.string(), // Which realm/org this identity belongs to
			orgUnitId: z.string().optional(), // Department/division
			positionId: z.string().optional(), // Job level
			employeeId: z.string().optional(), // NIK - UNIQUE, can be used as username	
			
			region: z.string().optional(),
			workLocation: z.string().optional(), // CGK, DPS, etc
			isRemote: z.boolean().optional(),
			
			// Employment details
			employmentType: z.enum(['permanent', 'pkwt', 'outsource', 'contract', 'mutation', 'assignment']).optional(),
			employmentStatus: z.enum(['active', 'probation', 'terminated', 'resigned']).optional(),

			letterId: z.custom<ObjectId>().optional(),
			letterNo: z.string().optional(),

			startDate: z.date(),
			endDate: z.date().optional(),

			createdAt: z.date().default(() => new Date()),
			createdBy: z.string()
		})
	).optional().default([]),

	// Two-Factor Authentication
	twoFactor: z.object({
		enabled: z.boolean().default(false),
		method: z.enum(['email_otp']).nullable().optional(),
		enabledAt: z.date().optional(),
		disabledAt: z.date().optional(),
		backupCodes: z.array(z.string()).optional().default([]), // hashed
		backupCodesGeneratedAt: z.date().optional(),
	}).optional(),

	// Custom properties (extensible)
	customProperties: z.record(z.string(), z.any()).optional().default({}),

	// === PARTNER-SPECIFIC FIELDS (only if identityType === 'partner') ===
	partnerType: z.enum(['vendor', 'contractor', 'consultant', 'client', 'supplier', 'other']).optional(),
	companyName: z.string().optional(),
	contractNumber: z.string().optional(),
	contractStartDate: z.date().optional(),
	contractEndDate: z.date().optional(),
	accessLevel: z.enum(['read', 'write', 'admin']).optional(),
	allowedModules: z.array(z.string()).optional().default([]),

	// === METADATA ===
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string().optional(),
	updatedBy: z.string().optional(),
	lastLogin: z.date().optional(),
});

export type Identity = z.infer<typeof IdentitySchema>;

// ── Domain helpers (use db.* internally) ────────────────────────────

import { db } from '../db';

export function findIdentityByEmail(email: string) {
	return db.identities.findOne({ email });
}

export function findIdentityByEmployeeId(nik: string) {
	return db.identities.findOne({ employeeId: nik, identityType: 'employee' });
}

export function findIdentityByEmailOrNIK(identifier: string) {
	return db.identities.findOne({
		$or: [
			{ email: identifier },
			{ employeeId: identifier }
		]
	} as any);
}

export function findIdentitiesByOrgUnit(orgUnitId: string) {
	return db.identities.find({ orgUnitId, identityType: 'employee' });
}

export async function updateLastLogin(id: string) {
	await db.identities.updateById(id, { lastLogin: new Date() } as any);
}

export async function bulkUpsertIdentities(
	identities: Omit<Identity, '_id'>[],
	preserveFields: string[] = ['isActive', 'password', 'employmentStatus']
): Promise<{ created: number; updated: number; errors: Array<{ identity: any; error: string }> }> {
	const results = { created: 0, updated: 0, errors: [] as Array<{ identity: any; error: string }> };

	for (const identity of identities) {
		try {
			const existingQuery = identity.identityType === 'employee' && identity.employeeId
				? { employeeId: identity.employeeId, identityType: 'employee' as const }
				: { email: identity.email };

			const existing = await db.identities.findOne(existingQuery as any);

			if (existing) {
				const updates: any = { ...identity };
				for (const field of preserveFields) {
					if (field in existing) delete updates[field];
				}
				await db.identities.updateById(existing._id!.toString(), updates);
				results.updated++;
			} else {
				await db.identities.insertOne(identity as any);
				results.created++;
			}
		} catch (error: any) {
			results.errors.push({ identity, error: error.message || 'Unknown error' });
		}
	}
	return results;
}

export async function getIdentityStats(organizationId: string) {
	const [total, employees, partners, external, active, inactive] = await Promise.all([
		db.identities.count({ organizationId } as any),
		db.identities.count({ organizationId, identityType: 'employee' } as any),
		db.identities.count({ organizationId, identityType: 'partner' } as any),
		db.identities.count({ organizationId, identityType: 'external' } as any),
		db.identities.count({ organizationId, isActive: true } as any),
		db.identities.count({ organizationId, isActive: false } as any),
	]);
	return { total, employees, partners, external, active, inactive };
}
