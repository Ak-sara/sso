import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { validateEmailAgainstRealmDomains } from '$lib/utils/email-validation';

export const load: PageServerLoad = async () => {
	const db = getDB();

	// Check if self-registration is enabled
	const registrationSetting = await db.collection('system_settings').findOne({
		key: 'enable_registration'
	});

	const isRegistrationEnabled = registrationSetting?.value === true;

	// Get all active realms/organizations
	const organizations = await db
		.collection('organizations')
		.find({ isActive: true })
		.sort({ name: 1 })
		.toArray();

	return {
		isRegistrationEnabled,
		realms: organizations.map((org) => ({
			code: org.code,
			name: org.name,
			type: org.type
		}))
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;
		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const realmCode = formData.get('realmCode') as string;

		const db = getDB();

		// Check if self-registration is enabled
		const registrationSetting = await db.collection('system_settings').findOne({
			key: 'enable_registration'
		});

		if (!registrationSetting || registrationSetting.value !== true) {
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

		// Check password minimum length
		const passwordMinLength = await db.collection('system_settings').findOne({
			key: 'password_min_length'
		});
		const minLength = passwordMinLength?.value || 8;

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

		// Check if email already exists
		const existingIdentity = await db.collection('identities').findOne({ email });
		if (existingIdentity) {
			return fail(400, {
				error: 'Email sudah terdaftar',
				email,
				firstName,
				lastName,
				realmCode
			});
		}

		// Get organization
		const organization = await db.collection('organizations').findOne({ code: realmCode });
		if (!organization) {
			return fail(400, {
				error: 'Organisasi tidak ditemukan',
				email,
				firstName,
				lastName,
				realmCode
			});
		}

		// Hash password
		const hashedPassword = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		// Check if email verification is required
		const emailVerificationSetting = await db.collection('system_settings').findOne({
			key: 'enable_email_verification'
		});
		const requiresEmailVerification = emailVerificationSetting?.value === true;

		// Create new identity
		const fullName = `${firstName} ${lastName}`;
		const username = email.split('@')[0]; // Use email prefix as username

		await db.collection('identities').insertOne({
			identityType: 'external',
			username,
			email,
			password: hashedPassword,
			isActive: !requiresEmailVerification, // Active immediately if no verification required
			emailVerified: false,
			roles: ['user'],
			firstName,
			lastName,
			fullName,
			organizationId: organization._id.toString(),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Send verification email if required
		if (requiresEmailVerification) {
			try {
				const { generateVerificationToken, hashToken } = await import('$lib/crypto');
				const { sendEmailWithSystemConfig } = await import('$lib/email/email-service');
				const { getVerificationEmail } = await import('$lib/email/templates');

				// Generate verification token
				const token = generateVerificationToken();
				const tokenHash = hashToken(token);

				// Store token in database (expires in 24 hours)
				await db.collection('verification_tokens').insertOne({
					email,
					tokenHash,
					type: 'email_verification',
					used: false,
					createdAt: new Date(),
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
				});

				// Send verification email
				const emailTemplate = getVerificationEmail(token, firstName);
				await sendEmailWithSystemConfig(email, emailTemplate.subject, emailTemplate.html, emailTemplate.text);

				return {
					success: true,
					message: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.'
				};
			} catch (emailError: any) {
				console.error('Error sending verification email:', emailError);
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
