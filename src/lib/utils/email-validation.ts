import { matchesDomainPattern, extractEmailDomain, isEmailDomainAllowed, useLogger } from '@ak-sara/fbao/foundation';
import { getDB } from '$lib/db/connection';

const log = useLogger({ module: 'utils:email-validation' });

export { matchesDomainPattern, extractEmailDomain, isEmailDomainAllowed };

/**
 * Validates if an email domain is allowed for a specific realm
 */
export async function validateEmailAgainstRealmDomains(
	email: string,
	realmCode: string
): Promise<{ isValid: boolean; error?: string }> {
	try {
		const emailDomain = email.split('@')[1]?.toLowerCase();
		if (!emailDomain) {
			return {
				isValid: false,
				error: 'Format email tidak valid'
			};
		}

		const db = getDB();

		const emailVerificationSetting = await db.collection('system_settings').findOne({
			key: 'enable_email_verification'
		});

		const requiresEmailVerification = emailVerificationSetting?.value === true;

		if (!requiresEmailVerification) {
			return { isValid: true };
		}

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

		const allowedDomains = realm.allowedEmailDomains || [];

		if (allowedDomains.length === 0) {
			return { isValid: true };
		}

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
		log.error('Error validating email domain', { error });
		return {
			isValid: false,
			error: 'Terjadi kesalahan saat memvalidasi domain email'
		};
	}
}
