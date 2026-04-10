/**
 * OTP with email delivery — SSO-specific wrapper around FBA's OTPService.
 */

import { OTPService, useLogger } from '@ak-sara/fbao/foundation';
import type { OTPValidation } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'auth:otp' });
import { getDB } from '$lib/db/connection';
import { sendEmailWithSystemConfig } from '$lib/email/email-service';
import { getOTPEmail } from '$lib/email/templates';

export type { OTPValidation };

const otpService = new OTPService(() => getDB(), {
	expiryMs: 10 * 60 * 1000,
	cooldownMs: 2 * 60 * 1000,
	maxAttempts: 5
});

export interface OTPOptions {
	email: string;
	purpose: 'login' | 'password_reset' | '2fa' | 'account_recovery' | 'verification';
	firstName?: string;
	expiryMinutes?: number;
	digits?: number;
}

/**
 * Generate OTP, send via email, return result.
 */
export async function sendOTP(
	options: OTPOptions
): Promise<{ success: boolean; error?: string }> {
	const { email, purpose, firstName = '' } = options;

	try {
		const { allowed, retryAfterMs } = await otpService.canRequestOTP(email, purpose);
		if (!allowed) {
			const seconds = Math.ceil((retryAfterMs ?? 0) / 1000);
			return {
				success: false,
				error: `OTP was recently sent. Please wait ${seconds} seconds before requesting again.`
			};
		}

		const { code } = await otpService.createOTP(email, purpose);

		const emailTemplate = getOTPEmail(code, firstName, purpose);
		await sendEmailWithSystemConfig(email, emailTemplate.subject, emailTemplate.html, emailTemplate.text);

		return { success: true };
	} catch (error: any) {
		log.error('Error sending OTP', { error });
		return { success: false, error: 'Failed to send OTP code. Please try again.' };
	}
}

/**
 * Validate OTP code.
 */
export async function validateOTP(
	email: string,
	otpCode: string,
	purpose: string
): Promise<OTPValidation> {
	try {
		return await otpService.verifyOTP(email, otpCode, purpose);
	} catch (error: any) {
		log.error('Error validating OTP', { error });
		return { isValid: false, error: 'An error occurred while validating the OTP code.' };
	}
}

/**
 * Check if a valid OTP exists (for UI state).
 */
export async function hasActiveOTP(email: string, purpose: string): Promise<boolean> {
	return otpService.hasActiveOTP(email, purpose);
}

/**
 * Clean up expired OTPs.
 */
export async function cleanupExpiredOTPs(): Promise<number> {
	return otpService.cleanup();
}
