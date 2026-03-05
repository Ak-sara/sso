/**
 * Data Masking Utilities for UU PDP Compliance
 * Masks sensitive personal data based on configurable rules
 */

export type MaskType = 'email' | 'phone' | 'ktp' | 'date' | 'custom' | 'none';

export interface MaskingRule {
	field: string;
	type: MaskType;
	showFirst?: number; // Characters to show at start
	showLast?: number; // Characters to show at end
	maskChar?: string; // Character to use for masking (default: *)
}

export interface MaskingConfig {
	enabled: boolean;
	rules: MaskingRule[];
	exemptRoles?: string[]; // Roles that can see unmasked data (e.g., ['admin', 'superadmin'])
}

/**
 * Mask an email address
 * Example: "user@example.com" → "u***@e***.com"
 */
function maskEmail(email: string, maskChar = '*'): string {
	if (!email || !email.includes('@')) return email;

	const [localPart, domain] = email.split('@');
	const [domainName, ...domainExt] = domain.split('.');

	// Show first character of local part
	const maskedLocal =
		localPart.length > 1
			? localPart[0] + maskChar.repeat(Math.max(localPart.length - 1, 3))
			: localPart;

	// Show first character of domain
	const maskedDomain =
		domainName.length > 1
			? domainName[0] + maskChar.repeat(Math.max(domainName.length - 1, 3))
			: domainName;

	return `${maskedLocal}@${maskedDomain}.${domainExt.join('.')}`;
}

/**
 * Mask a phone number
 * Example: "081234567890" → "0812****7890"
 */
function maskPhone(phone: string, showFirst = 4, showLast = 4, maskChar = '*'): string {
	if (!phone) return phone;

	const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
	if (cleaned.length <= showFirst + showLast) {
		return maskChar.repeat(cleaned.length);
	}

	const first = cleaned.substring(0, showFirst);
	const last = cleaned.substring(cleaned.length - showLast);
	const middleLength = cleaned.length - showFirst - showLast;

	return `${first}${maskChar.repeat(middleLength)}${last}`;
}

/**
 * Mask Indonesian KTP (ID number)
 * Example: "3201234567890123" → "3201****0123"
 */
function maskKTP(ktp: string, showFirst = 4, showLast = 4, maskChar = '*'): string {
	if (!ktp) return ktp;

	const cleaned = ktp.replace(/\D/g, '');
	if (cleaned.length !== 16) return maskChar.repeat(16); // Invalid KTP

	const first = cleaned.substring(0, showFirst);
	const last = cleaned.substring(cleaned.length - showLast);
	const middleLength = cleaned.length - showFirst - showLast;

	return `${first}${maskChar.repeat(middleLength)}${last}`;
}

/**
 * Mask a date
 * Example: "1990-05-15" → "****-**-15"
 */
function maskDate(date: string | Date, showDay = true, maskChar = '*'): string {
	if (!date) return '';

	const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
	const parts = dateStr.split('-');

	if (parts.length !== 3) return maskChar.repeat(10);

	const [year, month, day] = parts;
	const maskedYear = maskChar.repeat(4);
	const maskedMonth = maskChar.repeat(2);

	return showDay ? `${maskedYear}-${maskedMonth}-${day}` : `${maskedYear}-${maskedMonth}-${maskChar.repeat(2)}`;
}

/**
 * Generic string masking
 * Example: "Sensitive Data" → "Sen****ata"
 */
function maskCustom(
	value: string,
	showFirst = 3,
	showLast = 3,
	maskChar = '*'
): string {
	if (!value) return value;

	if (value.length <= showFirst + showLast) {
		return maskChar.repeat(value.length);
	}

	const first = value.substring(0, showFirst);
	const last = value.substring(value.length - showLast);
	const middleLength = value.length - showFirst - showLast;

	return `${first}${maskChar.repeat(middleLength)}${last}`;
}

/**
 * Main masking function - applies the appropriate masking based on type
 */
export function maskField(value: any, rule: MaskingRule): any {
	if (value === null || value === undefined) return value;
	if (rule.type === 'none') return value;

	const maskChar = rule.maskChar || '*';
	const strValue = String(value);

	switch (rule.type) {
		case 'email':
			return maskEmail(strValue, maskChar);

		case 'phone':
			return maskPhone(
				strValue,
				rule.showFirst ?? 4,
				rule.showLast ?? 4,
				maskChar
			);

		case 'ktp':
			return maskKTP(
				strValue,
				rule.showFirst ?? 4,
				rule.showLast ?? 4,
				maskChar
			);

		case 'date':
			return maskDate(strValue, true, maskChar);

		case 'custom':
			return maskCustom(
				strValue,
				rule.showFirst ?? 3,
				rule.showLast ?? 3,
				maskChar
			);

		default:
			return value;
	}
}

/**
 * Check if a user role is exempt from masking
 */
export function isExemptFromMasking(
	userRoles: string[],
	exemptRoles: string[] = ['admin', 'superadmin']
): boolean {
	return userRoles.some((role) => exemptRoles.includes(role));
}

/**
 * Apply masking rules to an identity object
 * Supports nested fields in customProperties
 */
export function getMaskedIdentity(
	identity: any,
	config: MaskingConfig,
	userRoles: string[] = []
): any {
	// If masking disabled or user is exempt, return original
	if (!config.enabled || isExemptFromMasking(userRoles, config.exemptRoles)) {
		return identity;
	}

	// Clone the identity to avoid mutating original
	const masked = JSON.parse(JSON.stringify(identity));

	// Apply each masking rule
	for (const rule of config.rules) {
		const fieldPath = rule.field.split('.');

		// Navigate to the field
		let current = masked;
		let parent = null;
		let lastKey = '';

		for (let i = 0; i < fieldPath.length; i++) {
			const key = fieldPath[i];
			lastKey = key;

			if (i === fieldPath.length - 1) {
				// Last key - apply masking
				parent = current;
			} else {
				// Navigate deeper
				if (!current[key]) break; // Field doesn't exist
				parent = current;
				current = current[key];
			}
		}

		// Apply masking to the field
		if (parent && parent[lastKey] !== undefined) {
			parent[lastKey] = maskField(parent[lastKey], rule);
		}
	}

	return masked;
}

/**
 * Apply masking rules to an array of identities
 */
export function getMaskedIdentities(
	identities: any[],
	config: MaskingConfig,
	userRoles: string[] = []
): any[] {
	return identities.map((identity) =>
		getMaskedIdentity(identity, config, userRoles)
	);
}

/**
 * Get default masking configuration
 */
export function getDefaultMaskingConfig(): MaskingConfig {
	return {
		enabled: true,
		rules: [
			{ field: 'email', type: 'email' },
			{ field: 'phone', type: 'phone', showFirst: 4, showLast: 4 },
			{ field: 'customProperties.ktp', type: 'ktp', showFirst: 4, showLast: 4 },
			{ field: 'customProperties.dob', type: 'date' }
		],
		exemptRoles: ['admin', 'superadmin']
	};
}
