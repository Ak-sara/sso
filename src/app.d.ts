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
			activeRealmId?: string;
			method:string;
			headers:Headers;
			routes: { 
				code?: string | undefined; 
				collection?: string | undefined; 
				id?: string | undefined; 
				slug?: string | undefined; 
			};
			query: Record<string, string>|null;
			body: Record<string, any>;
			vars:{
				user_agent:string;
				content_type:string;
				content_length:string;
				authorization:string;
			}
			audit?: { ipAddress?: string; userAgent?: string };
		}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}
}

export {};
