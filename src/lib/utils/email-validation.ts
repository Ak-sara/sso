import { getDB } from '$lib/db/connection';

/**
 * Check if a domain matches a pattern (supports wildcards)
 * @param emailDomain - The domain from the email (e.g., "ias.co.id")
 * @param pattern - The pattern to match against (e.g., "*.co.id" or "ias.co.id")
 * @returns true if domain matches the pattern
 */
export function matchesDomainPattern(emailDomain: string, pattern: string): boolean {
	const normalizedDomain = emailDomain.toLowerCase();
	const normalizedPattern = pattern.toLowerCase();

	// Exact match
	if (normalizedPattern === normalizedDomain) {
		return true;
	}

	// Wildcard pattern (e.g., *.com, *.co.id)
	if (normalizedPattern.startsWith('*.')) {
		const suffix = normalizedPattern.substring(1); // Remove * to get .com, .co.id
		return normalizedDomain.endsWith(suffix);
	}

	return false;
}

/**
 * Validates if an email domain is allowed for a specific realm
 * @param email - The email address to validate
 * @param realmCode - The organization/realm code
 * @returns Object with isValid flag and error message if invalid
 */
export async function validateEmailAgainstRealmDomains(
	email: string,
	realmCode: string
): Promise<{ isValid: boolean; error?: string }> {
	try {
		// Extract domain from email
		const emailDomain = email.split('@')[1]?.toLowerCase();
		if (!emailDomain) {
			return {
				isValid: false,
				error: 'Format email tidak valid'
			};
		}

		const db = getDB();

		// Check if email verification is required
		// If email verification is OFF, we allow all domains (open registration)
		// If email verification is ON, we enforce domain restrictions
		const emailVerificationSetting = await db.collection('system_settings').findOne({
			key: 'enable_email_verification'
		});

		const requiresEmailVerification = emailVerificationSetting?.value === true;

		// If email verification is not required, allow all domains (bypass domain check)
		if (!requiresEmailVerification) {
			return { isValid: true };
		}

		// Get realm configuration
		const realm = await db.collection('organizations').findOne(
			{ code: realmCode },
			{ projection: { allowedEmailDomains: 1, name: 1 } }
		);

		if (!realm) {
			return {
				isValid: false,
				error: 'Organisasi tidak ditemukan'
			};
		}

		// If no domains configured, allow all (no restrictions)
		// Only enforce whitelist when domains are explicitly configured
		const allowedDomains = realm.allowedEmailDomains || [];

		if (allowedDomains.length === 0) {
			return { isValid: true };
		}

		// Check if email domain matches any pattern (exact or wildcard)
		const isDomainAllowed = allowedDomains.some((pattern: string) =>
			matchesDomainPattern(emailDomain, pattern)
		);

		if (!isDomainAllowed) {
			return {
				isValid: false,
				error: 'Domain email tidak diizinkan. Silakan hubungi administrator/supervisor untuk proses onboarding.'
			};
		}

		return { isValid: true };
	} catch (error) {
		console.error('Error validating email domain:', error);
		return {
			isValid: false,
			error: 'Terjadi kesalahan saat memvalidasi domain email'
		};
	}
}

/**
 * Extract domain from email address
 * @param email - Email address
 * @returns Domain part of the email (lowercase)
 */
export function extractEmailDomain(email: string): string | null {
	const parts = email.split('@');
	return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * Check if email belongs to any of the allowed domains
 * @param email - Email address to check
 * @param allowedDomains - List of allowed domains (supports wildcards like *.com)
 * @returns true if email domain matches any allowed pattern
 */
export function isEmailDomainAllowed(email: string, allowedDomains: string[]): boolean {
	const emailDomain = extractEmailDomain(email);
	if (!emailDomain) return false;

	return allowedDomains.some((pattern) => matchesDomainPattern(emailDomain, pattern));
}
