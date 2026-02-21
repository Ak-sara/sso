/**
 * OTP (One-Time Password) Utilities
 * For email-based OTP authentication, 2FA, password reset, etc.
 */

import { getDB } from '$lib/db/connection';
import { generateOTP } from '$lib/crypto';
import { sendEmailWithSystemConfig } from '$lib/email/email-service';
import { getOTPEmail } from '$lib/email/templates';

export interface OTPOptions {
	email: string;
	purpose: 'login' | 'password_reset' | '2fa' | 'account_recovery' | 'verification';
	firstName?: string;
	expiryMinutes?: number; // Default: 10 minutes
	digits?: number; // Default: 6
}

export interface OTPValidation {
	isValid: boolean;
	error?: string;
	attemptsRemaining?: number;
}

/**
 * Generate and send OTP to user's email
 */
export async function sendOTP(options: OTPOptions): Promise<{ success: boolean; error?: string }> {
	const {
		email,
		purpose,
		firstName = '',
		expiryMinutes = 10,
		digits = 6
	} = options;

	const db = getDB();

	try {
		// Rate limiting: check if OTP was sent recently (prevent spam)
		const recentOTP = await db.collection('otp_codes').findOne({
			email,
			purpose,
			createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // Last 2 minutes
		});

		if (recentOTP) {
			return {
				success: false,
				error: 'Kode OTP baru saja dikirim. Silakan tunggu 2 menit sebelum meminta ulang.'
			};
		}

		// Generate OTP code
		const otpCode = generateOTP(digits);

		// Invalidate old OTPs for this email and purpose
		await db.collection('otp_codes').updateMany(
			{
				email,
				purpose,
				used: false
			},
			{
				$set: {
					used: true,
					invalidatedAt: new Date()
				}
			}
		);

		// Store OTP in database
		await db.collection('otp_codes').insertOne({
			email,
			otpCode, // Store plain OTP (not hashed) for validation
			purpose,
			used: false,
			attempts: 0,
			maxAttempts: 5, // Allow 5 wrong attempts
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000)
		});

		// Send OTP email
		const emailTemplate = getOTPEmail(otpCode, firstName, purpose);
		await sendEmailWithSystemConfig(
			email,
			emailTemplate.subject,
			emailTemplate.html,
			emailTemplate.text
		);

		return { success: true };
	} catch (error: any) {
		console.error('Error sending OTP:', error);
		return {
			success: false,
			error: 'Gagal mengirim kode OTP. Silakan coba lagi.'
		};
	}
}

/**
 * Validate OTP code
 */
export async function validateOTP(
	email: string,
	otpCode: string,
	purpose: string
): Promise<OTPValidation> {
	const db = getDB();

	try {
		// Find the OTP
		const otpRecord = await db.collection('otp_codes').findOne({
			email,
			purpose,
			used: false
		});

		if (!otpRecord) {
			return {
				isValid: false,
				error: 'Kode OTP tidak ditemukan atau sudah digunakan.'
			};
		}

		// Check if expired
		if (new Date() > new Date(otpRecord.expiresAt)) {
			await db.collection('otp_codes').updateOne(
				{ _id: otpRecord._id },
				{ $set: { used: true, expiredAt: new Date() } }
			);

			return {
				isValid: false,
				error: 'Kode OTP sudah kadaluarsa. Silakan minta kode baru.'
			};
		}

		// Check max attempts
		if (otpRecord.attempts >= otpRecord.maxAttempts) {
			await db.collection('otp_codes').updateOne(
				{ _id: otpRecord._id },
				{ $set: { used: true, lockedAt: new Date() } }
			);

			return {
				isValid: false,
				error: 'Terlalu banyak percobaan gagal. Silakan minta kode OTP baru.'
			};
		}

		// Validate OTP code
		if (otpRecord.otpCode !== otpCode) {
			// Increment attempts
			const newAttempts = otpRecord.attempts + 1;
			await db.collection('otp_codes').updateOne(
				{ _id: otpRecord._id },
				{ $set: { attempts: newAttempts } }
			);

			const remaining = otpRecord.maxAttempts - newAttempts;

			return {
				isValid: false,
				error: `Kode OTP salah. ${remaining} percobaan tersisa.`,
				attemptsRemaining: remaining
			};
		}

		// OTP is valid - mark as used
		await db.collection('otp_codes').updateOne(
			{ _id: otpRecord._id },
			{
				$set: {
					used: true,
					usedAt: new Date()
				}
			}
		);

		return { isValid: true };
	} catch (error: any) {
		console.error('Error validating OTP:', error);
		return {
			isValid: false,
			error: 'Terjadi kesalahan saat memvalidasi kode OTP.'
		};
	}
}

/**
 * Check if a valid OTP exists for email and purpose (for UI state management)
 */
export async function hasActiveOTP(email: string, purpose: string): Promise<boolean> {
	const db = getDB();

	const activeOTP = await db.collection('otp_codes').findOne({
		email,
		purpose,
		used: false,
		expiresAt: { $gt: new Date() }
	});

	return !!activeOTP;
}

/**
 * Clean up expired OTPs (should be run periodically via cron/cleanup job)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
	const db = getDB();

	const result = await db.collection('otp_codes').deleteMany({
		$or: [
			{ expiresAt: { $lt: new Date() } },
			{ used: true, usedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Delete used OTPs older than 7 days
		]
	});

	return result.deletedCount;
}
