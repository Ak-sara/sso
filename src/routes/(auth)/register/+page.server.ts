import type { PageServerLoad, Actions } from './$types';
import { Repository, lazy } from '$lib/db/db';
import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { validateEmailAgainstRealmDomains } from '$lib/utils/email-validation';
import { useLogger } from '@ak-sara/fbao/foundation';
import { getSetting } from '$lib/services/settings-service';
import { listOrganizations, getOrganizationByCode } from '$lib/services/organization-service';
import { createIdentity } from '$lib/services/identity-service';
import { env } from '$env/dynamic/private';

const log = useLogger({ module: 'auth:register' });

const verificationTokens = new Repository(lazy, 'verification_tokens');

export const load: PageServerLoad = async () => {
	const [isRegistrationEnabled, organizations] = await Promise.all([
		getSetting<boolean>('enable_registration'),
		listOrganizations(),
	]);
	return {
		appName:env.APPNAME,
		isRegistrationEnabled: isRegistrationEnabled === true,
		realms: organizations.map(org => ({ code: org.code, name: org.name, type: org.type }))
	};
};

export const actions: Actions = {
	default: async ({ locals }) => {
		const formData = locals.body
		const email = formData?.email;
		const password = formData?.password;
		const confirmPassword = formData?.confirmPassword;
		const firstName = formData?.firstName;
		const lastName = formData?.lastName;
		const realmCode = formData?.realmCode;

		const registrationEnabled = await getSetting<boolean>('enable_registration');
		if (!registrationEnabled) {
			return fail(403, {
				error: 'Pendaftaran mandiri saat ini dinonaktifkan. Silakan hubungi administrator.',
				email,
				firstName,
				lastName,
				realmCode
			});
		}

		// Validation
		if (!email || !password || !firstName || !lastName || !realmCode) {
			return fail(400, { error: 'Semua field wajib diisi', email, firstName, lastName, realmCode });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Password tidak cocok', email, firstName, lastName, realmCode });
		}

		const minLength = (await getSetting<number>('password_min_length')) ?? 8;

		if (password.length < minLength) {
			return fail(400, {
				error: `Password minimal ${minLength} karakter`,
				email,
				firstName,
				lastName,
				realmCode
			});
		}

		// Validate email domain against realm
		const domainValidation = await validateEmailAgainstRealmDomains(email, realmCode);
		if (!domainValidation.isValid) {
			return fail(400, {
				error: domainValidation.error,
				email,
				firstName,
				lastName,
				realmCode
			});
		}

		const { db } = await import('$lib/db/db');
		const existingIdentity = await db.identities.findOne({ email } as any);
		if (existingIdentity) return fail(400, { error: 'Email sudah terdaftar', email, firstName, lastName, realmCode });

		const orgResult = await getOrganizationByCode(realmCode);
		if (!orgResult.ok) return fail(400, { error: 'Organisasi tidak ditemukan', email, firstName, lastName, realmCode });

		// Hash password
		const hashedPassword = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		const requiresEmailVerification = (await getSetting<boolean>('enable_email_verification')) === true;

		const fullName = `${firstName} ${lastName}`;
		const username = email.split('@')[0];

		await createIdentity({
			identityType: 'external',
			username, email, password: hashedPassword,
			isActive: !requiresEmailVerification,
			emailVerified: false, roles: ['user'],
			firstName, lastName, fullName,
			organizationId: orgResult.data._id,
			createdAt: new Date(), updatedAt: new Date(),
		} as any);

		// Send verification email if required
		if (requiresEmailVerification) {
			try {
				const { generateVerificationToken, hashToken } = await import('$lib/crypto');
				const { sendMail } = await import('$lib/email/email-service');
				const { getVerificationEmail } = await import('$lib/email/templates');

				// Generate verification token
				const token = generateVerificationToken();
				const tokenHash = hashToken(token);

				// Store token in database (expires in 24 hours)
				await verificationTokens.insertOne({
					email,
					tokenHash,
					type: 'email_verification',
					used: false,
					createdAt: new Date(),
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
				});

				// Send verification email
				const emailTemplate = getVerificationEmail(token, firstName);
				const sent = await sendMail(realmCode, email, emailTemplate.subject, emailTemplate.html, emailTemplate.text);
				if (!sent.ok) throw new Error(sent.reason);

				return {
					success: true,
					message: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.'
				};
			} catch (emailError: any) {
				log.error('Error sending verification email', { error: emailError });
				// Registration was successful, but email failed - still return success
				return {
					success: true,
					message: 'Registrasi berhasil! Email verifikasi akan segera dikirim.'
				};
			}
		} else {
			return {
				success: true,
				message: 'Registrasi berhasil! Anda dapat login sekarang.'
			};
		}
	}
};
