/**
 * Identity Import Utilities
 *
 * Shared logic for importing identities from CSV (both CLI and web UI)
 * Handles smart matching, conflict detection, and validation
 */

import type { Db } from 'mongodb';
import type { Identity } from '$lib/db/schemas';

export interface IdentityConflict {
	type: 'nik_to_emails' | 'email_to_niks';
	key: string; // NIK or Email
	values: string[]; // List of conflicting emails or NIKs
	message: string;
}

/**
 * Detect NIK ↔ Email conflicts in identity data
 * @param identities - Array of identities to check (can be partial)
 * @returns Array of conflict objects
 */
export function detectNIKEmailConflicts(
	identities: Array<Partial<Identity>>
): IdentityConflict[] {
	const conflicts: IdentityConflict[] = [];

	// Build maps of NIK → emails and email → NIKs
	const nikToEmails = new Map<string, Set<string>>();
	const emailToNiks = new Map<string, Set<string>>();

	for (const identity of identities) {
		if (identity.employeeId && identity.email) {
			// Track NIK → email relationships
			if (!nikToEmails.has(identity.employeeId)) {
				nikToEmails.set(identity.employeeId, new Set());
			}
			nikToEmails.get(identity.employeeId)!.add(identity.email);

			// Track email → NIK relationships
			if (!emailToNiks.has(identity.email)) {
				emailToNiks.set(identity.email, new Set());
			}
			emailToNiks.get(identity.email)!.add(identity.employeeId);
		}
	}

	// Check for 1:many NIK → email conflicts
	for (const [nik, emails] of nikToEmails.entries()) {
		if (emails.size > 1) {
			conflicts.push({
				type: 'nik_to_emails',
				key: nik,
				values: Array.from(emails),
				message: `NIK "${nik}" is mapped to multiple emails: ${Array.from(emails).join(', ')}`
			});
		}
	}

	// Check for 1:many email → NIK conflicts
	for (const [email, niks] of emailToNiks.entries()) {
		if (niks.size > 1) {
			conflicts.push({
				type: 'email_to_niks',
				key: email,
				values: Array.from(niks),
				message: `Email "${email}" is mapped to multiple NIKs: ${Array.from(niks).join(', ')}`
			});
		}
	}

	return conflicts;
}

/**
 * Check conflicts against existing database records
 * @param db - MongoDB database instance
 * @param newIdentities - New/updated identities to check
 * @returns Array of conflict messages
 */
export async function detectConflictsWithDatabase(
	db: Db,
	newIdentities: Array<Partial<Identity>>
): Promise<IdentityConflict[]> {
	const conflicts: IdentityConflict[] = [];

	// Build maps from new data
	const nikToEmails = new Map<string, string>();
	const emailToNiks = new Map<string, string>();

	for (const identity of newIdentities) {
		if (identity.employeeId && identity.email) {
			nikToEmails.set(identity.employeeId, identity.email);
			emailToNiks.set(identity.email, identity.employeeId);
		}
	}

	// Get unique NIKs and emails to check
	const niks = Array.from(nikToEmails.keys());
	const emails = Array.from(emailToNiks.keys());

	if (niks.length === 0 && emails.length === 0) {
		return [];
	}

	// Query existing identities
	const query: any[] = [];
	if (niks.length > 0) {
		query.push({ employeeId: { $in: niks } });
	}
	if (emails.length > 0) {
		query.push({ email: { $in: emails } });
	}

	const existingIdentities = await db
		.collection('identities')
		.find(query.length > 0 ? { $or: query } : {})
		.toArray();

	// Check for conflicts with existing data
	for (const existing of existingIdentities) {
		if (existing.employeeId && existing.email) {
			// Check if new data changes the NIK ↔ email relationship
			const newEmailForNik = nikToEmails.get(existing.employeeId);
			if (newEmailForNik && newEmailForNik !== existing.email) {
				conflicts.push({
					type: 'nik_to_emails',
					key: existing.employeeId,
					values: [existing.email, newEmailForNik],
					message: `NIK "${existing.employeeId}" currently has email "${existing.email}" in DB, but CSV wants to change it to: ${newEmailForNik}`
				});
			}

			const newNikForEmail = emailToNiks.get(existing.email);
			if (newNikForEmail && newNikForEmail !== existing.employeeId) {
				conflicts.push({
					type: 'email_to_niks',
					key: existing.email,
					values: [existing.employeeId, newNikForEmail],
					message: `Email "${existing.email}" currently has NIK "${existing.employeeId}" in DB, but CSV wants to change it to: ${newNikForEmail}`
				});
			}
		}
	}

	return conflicts;
}

/**
 * Get unique filter for upserting identities
 * Priority: employeeId (NIK) > email > username
 */
export function getIdentityUniqueFilter(identity: Partial<Identity>): any {
	if (identity.employeeId) {
		return { employeeId: identity.employeeId };
	} else if (identity.email) {
		return { email: identity.email };
	} else if (identity.username) {
		return { username: identity.username };
	}
	return { _id: identity._id }; // Fallback
}

/**
 * Normalize CSV column names to identity field names
 * Handles various naming conventions
 */
export function normalizeCSVColumns(row: Record<string, string>): {
	nik?: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	orgUnit?: string;
	position?: string;
	employmentType?: string;
	workLocation?: string;
} {
	return {
		nik: row.NIK || row.nik || row.employeeId || row.employee_id,
		email: row.Email || row.email,
		firstName: row.FirstName || row.firstName || row.first_name,
		lastName: row.LastName || row.lastName || row.last_name,
		orgUnit: row.OrgUnit || row.orgUnit || row.org_unit,
		position: row.Position || row.position,
		employmentType: row.EmploymentType || row.employmentType || row.employment_type,
		workLocation: row.WorkLocation || row.workLocation || row.work_location
	};
}

/**
 * Validate required fields for identity creation
 */
export function validateIdentityFields(data: {
	nik?: string;
	email?: string;
	firstName?: string;
	lastName?: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// At least NIK or Email is required
	if (!data.nik && !data.email) {
		errors.push('Either NIK or Email is required');
	}

	// First name is required, last name is optional
	if (!data.firstName) {
		errors.push('FirstName is required');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Generate warnings for incomplete data
 */
export function generateDataWarnings(data: {
	nik?: string;
	email?: string;
	firstName: string;
	lastName?: string;
}): string[] {
	const warnings: string[] = [];
	const fullName = `${data.firstName} ${data.lastName || ''}`.trim();

	if (!data.email) {
		warnings.push(
			`No email provided for ${fullName}${data.nik ? ` (NIK: ${data.nik})` : ''} - NIK will be used as username`
		);
	}

	if (!data.nik) {
		warnings.push(
			`No NIK provided for ${fullName}${data.email ? ` (Email: ${data.email})` : ''} - Login with NIK won't work`
		);
	}

	return warnings;
}
