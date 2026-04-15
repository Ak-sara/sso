/**
 * Two-Factor Authentication (2FA) Module
 * Provides OTP-based 2FA for enhanced security
 */

import { getDB } from '$lib/db/connection';
import { sendOTP, validateOTP } from './otp';
import { logAudit } from '$lib/audit/logger';
import { useLogger } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'auth:2fa' });

/**
 * Enable 2FA for a user
 */
export async function enable2FA(identityId: string, email: string): Promise<{ success: boolean; error?: string }> {
	const db = getDB();

	try {
		// Update identity to enable 2FA
		const result = await db.collection('identities').updateOne(
			{ _id: { $oid: identityId } },
			{
				$set: {
					'twoFactor.enabled': true,
					'twoFactor.method': 'email_otp',
					'twoFactor.enabledAt': new Date(),
					updatedAt: new Date()
				}
			}
		);

		if (result.modifiedCount === 0) {
			return { success: false, error: 'Failed to enable 2FA' };
		}

		// Log audit event
		await logAudit({ action: '2fa_enabled', resource: 'sessions', identityId, details: { email, method: 'email_otp' } });

		return { success: true };
	} catch (error: any) {
		log.error('Error enabling 2FA', { error, identityId });
		return { success: false, error: 'Failed to enable 2FA' };
	}
}

/**
 * Disable 2FA for a user (requires OTP verification first)
 */
export async function disable2FA(identityId: string, email: string): Promise<{ success: boolean; error?: string }> {
	const db = getDB();

	try {
		// Update identity to disable 2FA
		const result = await db.collection('identities').updateOne(
			{ _id: { $oid: identityId } },
			{
				$set: {
					'twoFactor.enabled': false,
					'twoFactor.disabledAt': new Date(),
					updatedAt: new Date()
				}
			}
		);

		if (result.modifiedCount === 0) {
			return { success: false, error: 'Failed to disable 2FA' };
		}

		// Log audit event
		await logAudit({ action: '2fa_disabled', resource: 'sessions', identityId, details: { email } });

		return { success: true };
	} catch (error: any) {
		log.error('Error disabling 2FA', { error, identityId });
		return { success: false, error: 'Failed to disable 2FA' };
	}
}

/**
 * Check if 2FA is enabled for a user
 */
export async function is2FAEnabled(identityId: string): Promise<boolean> {
	const db = getDB();

	const identity = await db.collection('identities').findOne(
		{ _id: { $oid: identityId } },
		{ projection: { twoFactor: 1 } }
	);

	return identity?.twoFactor?.enabled === true;
}

/**
 * Send 2FA OTP code
 */
export async function send2FAOTP(
	email: string,
	firstName?: string
): Promise<{ success: boolean; error?: string }> {
	const result = await sendOTP({
		email,
		purpose: '2fa',
		firstName,
		expiryMinutes: 10
	});

	return result;
}

/**
 * Verify 2FA OTP code
 */
export async function verify2FAOTP(
	email: string,
	otpCode: string,
	identityId?: string
): Promise<{ isValid: boolean; error?: string; attemptsRemaining?: number }> {
	const validation = await validateOTP(email, otpCode, '2fa');

	// Log the verification attempt
	if (identityId) {
		const action = validation.isValid ? '2fa_verified' : '2fa_failed';
		await logAudit({ action, resource: 'sessions', identityId, status: validation.isValid ? 'success' : 'failed', details: { email, reason: validation.error, attemptsRemaining: validation.attemptsRemaining } });
	}

	return validation;
}

/**
 * Generate backup codes for 2FA (in case user loses email access)
 */
export async function generateBackupCodes(identityId: string): Promise<string[]> {
	const db = getDB();
	const crypto = await import('crypto');

	// Generate 10 backup codes (8 characters each)
	const backupCodes: string[] = [];
	for (let i = 0; i < 10; i++) {
		const code = crypto.randomBytes(4).toString('hex').toUpperCase();
		backupCodes.push(code);
	}

	// Hash backup codes before storing
	const hashedCodes = backupCodes.map((code) =>
		crypto.createHash('sha256').update(code).digest('hex')
	);

	// Store hashed codes
	await db.collection('identities').updateOne(
		{ _id: { $oid: identityId } },
		{
			$set: {
				'twoFactor.backupCodes': hashedCodes,
				'twoFactor.backupCodesGeneratedAt': new Date(),
				updatedAt: new Date()
			}
		}
	);

	// Return plain codes to user (show only once)
	return backupCodes;
}

/**
 * Verify backup code
 */
export async function verifyBackupCode(identityId: string, code: string): Promise<boolean> {
	const db = getDB();
	const crypto = await import('crypto');

	// Hash the provided code
	const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

	const identity = await db.collection('identities').findOne({
		_id: { $oid: identityId },
		'twoFactor.backupCodes': hashedCode
	});

	if (!identity) {
		return false;
	}

	// Remove used backup code
	await db.collection('identities').updateOne(
		{ _id: { $oid: identityId } },
		{
			$pull: {
				'twoFactor.backupCodes': hashedCode
			} as any,
			$set: {
				updatedAt: new Date()
			}
		}
	);

	return true;
}

/**
 * Get 2FA status for a user
 */
export async function get2FAStatus(identityId: string) {
	const db = getDB();

	const identity = await db.collection('identities').findOne(
		{ _id: { $oid: identityId } },
		{ projection: { twoFactor: 1, email: 1 } }
	);

	if (!identity) {
		return null;
	}

	return {
		enabled: identity.twoFactor?.enabled || false,
		method: identity.twoFactor?.method || null,
		enabledAt: identity.twoFactor?.enabledAt || null,
		backupCodesCount: identity.twoFactor?.backupCodes?.length || 0,
		email: identity.email
	};
}
