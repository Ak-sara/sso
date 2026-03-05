import { hash, verify } from '@node-rs/argon2';

export interface PasswordValidation {
	isValid: boolean;
	errors: string[];
}

export class PasswordService {
	async hashPassword(password: string): Promise<string> {
		return await hash(password);
	}

	async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
		try {
			return await verify(hashedPassword, plainPassword);
		} catch {
			return false;
		}
	}

	validatePassword(password: string): PasswordValidation {
		const errors: string[] = [];

		if (password.length < 8) {
			errors.push('Password harus minimal 8 karakter');
		}

		if (!/[A-Z]/.test(password)) {
			errors.push('Password harus mengandung huruf besar');
		}

		if (!/[a-z]/.test(password)) {
			errors.push('Password harus mengandung huruf kecil');
		}

		if (!/[0-9]/.test(password)) {
			errors.push('Password harus mengandung angka');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}
}

export const passwordService = new PasswordService();
