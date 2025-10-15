import type { Cookies } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import { getDB } from '$lib/db/connection';

export interface Session {
	sessionId: string;
	userId: string;
	email: string;
	username: string;
	firstName?: string;
	lastName?: string;
	roles: string[];
	organizationId?: string;
	createdAt: Date;
	expiresAt: Date;
	lastActivity: Date;
}

const SESSION_COOKIE_NAME = 'aksara_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const IDLE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours of inactivity

export class SessionManager {
	private get collection() {
		return getDB().collection<Session>('sessions');
	}

	async createSession(
		userId: string,
		email: string,
		username: string,
		roles: string[],
		firstName?: string,
		lastName?: string,
		organizationId?: string
	): Promise<Session> {
		const sessionId = randomBytes(32).toString('hex');
		const now = new Date();
		const expiresAt = new Date(now.getTime() + SESSION_DURATION);

		const session: Session = {
			sessionId,
			userId,
			email,
			username,
			firstName,
			lastName,
			roles,
			organizationId,
			createdAt: now,
			expiresAt,
			lastActivity: now,
		};

		await this.collection.insertOne(session);
		return session;
	}

	async getSession(sessionId: string): Promise<Session | null> {
		const session = await this.collection.findOne({ sessionId });

		if (!session) {
			return null;
		}

		const now = new Date();

		// Check if session expired
		if (session.expiresAt < now) {
			await this.deleteSession(sessionId);
			return null;
		}

		// Check idle timeout
		const idleTime = now.getTime() - session.lastActivity.getTime();
		if (idleTime > IDLE_TIMEOUT) {
			await this.deleteSession(sessionId);
			return null;
		}

		// Update last activity
		await this.collection.updateOne(
			{ sessionId },
			{ $set: { lastActivity: now } }
		);

		return session;
	}

	async deleteSession(sessionId: string): Promise<void> {
		await this.collection.deleteOne({ sessionId });
	}

	async deleteUserSessions(userId: string): Promise<void> {
		await this.collection.deleteMany({ userId });
	}

	async cleanupExpiredSessions(): Promise<void> {
		const now = new Date();
		await this.collection.deleteMany({
			$or: [
				{ expiresAt: { $lt: now } },
				{ lastActivity: { $lt: new Date(now.getTime() - IDLE_TIMEOUT) } }
			]
		});
	}

	setSessionCookie(cookies: Cookies, sessionId: string): void {
		cookies.set(SESSION_COOKIE_NAME, sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: SESSION_DURATION / 1000,
		});
	}

	getSessionCookie(cookies: Cookies): string | undefined {
		return cookies.get(SESSION_COOKIE_NAME);
	}

	clearSessionCookie(cookies: Cookies): void {
		cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	}
}

export const sessionManager = new SessionManager();
