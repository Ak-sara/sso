import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import { hashToken } from '$lib/crypto';
import { sendEmailWithSystemConfig } from '$lib/email/email-service';
import { getWelcomeEmail } from '$lib/email/templates';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return {
			status: 'error',
			message: 'Token verifikasi tidak ditemukan'
		};
	}

	const db = getDB();

	// Hash the token to match stored value
	const tokenHash = hashToken(token);

	// Find the verification token
	const verificationToken = await db.collection('verification_tokens').findOne({
		tokenHash,
		type: 'email_verification',
		used: false
	});

	if (!verificationToken) {
		return {
			status: 'error',
			message: 'Token verifikasi tidak valid atau sudah digunakan'
		};
	}

	// Check if token is expired
	if (new Date() > new Date(verificationToken.expiresAt)) {
		return {
			status: 'error',
			message: 'Token verifikasi sudah kadaluarsa. Silakan minta token baru.'
		};
	}

	try {
		// Update identity to verified
		const updateResult = await db.collection('identities').updateOne(
			{ email: verificationToken.email },
			{
				$set: {
					emailVerified: true,
					isActive: true,
					verifiedAt: new Date(),
					updatedAt: new Date()
				}
			}
		);

		if (updateResult.matchedCount === 0) {
			return {
				status: 'error',
				message: 'Akun tidak ditemukan'
			};
		}

		// Mark token as used
		await db.collection('verification_tokens').updateOne(
			{ _id: verificationToken._id },
			{
				$set: {
					used: true,
					usedAt: new Date()
				}
			}
		);

		// Get identity details for welcome email
		const identity = await db.collection('identities').findOne({ email: verificationToken.email });

		// Get organization name
		const organization = await db.collection('organizations').findOne({
			_id: { $oid: identity?.organizationId }
		});

		// Send welcome email (fire and forget - don't block verification)
		if (identity && organization) {
			sendEmailWithSystemConfig(
				identity.email,
				...Object.values(getWelcomeEmail(identity.firstName, organization.name))
			).catch((err) => {
				console.error('Failed to send welcome email:', err);
			});
		}

		return {
			status: 'success',
			message: 'Email berhasil diverifikasi! Akun Anda sekarang aktif.'
		};
	} catch (error: any) {
		console.error('Error verifying email:', error);
		return {
			status: 'error',
			message: 'Terjadi kesalahan saat memverifikasi email'
		};
	}
};
