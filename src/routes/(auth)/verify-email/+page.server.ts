import type { PageServerLoad } from './$types';
import { db, Repository, lazy } from '$lib/db/db';
import { hashToken } from '$lib/crypto';
import { queueEmail } from '$lib/email/email-service';
import { getWelcomeEmail } from '$lib/email/templates';
import { useLogger } from '@ak-sara/fbao/foundation';
import { APPNAME } from '$env/static/private';

const log = useLogger({ module: 'auth:verify-email' });

const verificationTokens = new Repository(lazy, 'verification_tokens');

export const load: PageServerLoad = async ({ locals }) => {
	const token = locals.query?.token;

	if (!token) {
		return {
			appName:APPNAME,
			status: 'error',
			message: 'Token verifikasi tidak ditemukan'
		};
	}

	// Hash the token to match stored value
	const tokenHash = hashToken(token);

	// Find the verification token
	const verificationToken = await verificationTokens.findOne({
		tokenHash,
		type: 'email_verification',
		used: false
	});

	if (!verificationToken) {
		return {
			appName:APPNAME,
			status: 'error',
			message: 'Token verifikasi tidak valid atau sudah digunakan'
		};
	}

	// Check if token is expired
	if (new Date() > new Date(verificationToken.expiresAt)) {
		return {
			appName:APPNAME,
			status: 'error',
			message: 'Token verifikasi sudah kadaluarsa. Silakan minta token baru.'
		};
	}

	try {
		// Update identity to verified
		const updateResult = await db.identities.col.updateOne(
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
				appName:APPNAME,
				status: 'error',
				message: 'Akun tidak ditemukan'
			};
		}

		// Mark token as used
		await verificationTokens.updateOne(
			{ _id: verificationToken._id },
			{
				used: true,
				usedAt: new Date()
			}
		);

		// Get identity details for welcome email
		const identity = await db.identities.findOne({ email: verificationToken.email });

		// Get organization by id
		const organization = identity?.organizationId
			? await db.organizations.findById(identity.organizationId)
			: null;

		// Send welcome email (fire and forget - don't block verification)
		if (identity && organization) {
			const { subject, html, text } = getWelcomeEmail(identity.firstName, organization.name);
			const { resolveRealmCode } = await import('$lib/services/settings-service');
			const realmCode = await resolveRealmCode(identity.organizationId);
			queueEmail(realmCode, identity.email as string, subject, html, text)
				.catch((err) => log.error('Failed to queue welcome email', { error: err?.message ?? err }));
		}

		return {
			appName:APPNAME,
			status: 'success',
			message: 'Email berhasil diverifikasi! Akun Anda sekarang aktif.'
		};
	} catch (error: any) {
		log.error('Error verifying email', { error });
		return {
			status: 'error',
			message: 'Terjadi kesalahan saat memverifikasi email'
		};
	}
};
