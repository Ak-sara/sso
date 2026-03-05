import type { Session } from '$lib/auth/session';

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			user?: {
				userId: string;
				email: string;
				username: string;
				firstName?: string;
				lastName?: string;
				roles: string[];
				organizationId?: string;
			};
			session?: Session;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}
}

export {};
