/**
 * Microsoft Graph API Client
 * For syncing with Microsoft Entra ID (formerly Azure AD)
 *
 * Uses FBA request module for retry, timeout, and structured errors.
 */

import { request, RequestError, useLogger } from '@ak-sara/fbao/foundation';
import type { EntraIDConfig } from '$lib/db/schemas';

const log = useLogger({ module: 'entraid' });

export interface GraphTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
}

export interface GraphUser {
	id: string;
	userPrincipalName: string;
	displayName: string;
	givenName?: string;
	surname?: string;
	mail?: string;
	mobilePhone?: string;
	jobTitle?: string;
	department?: string;
}

// ─── Pre-configured clients ─────────────────────────────────────────────────

const graphApi = request.define({
	baseUrl: 'https://graph.microsoft.com/v1.0',
	timeout: 15_000,
	retry: 2
});

/**
 * Get OAuth 2.0 access token from Microsoft Entra ID
 */
export async function getMicrosoftGraphToken(
	tenantId: string,
	clientId: string,
	clientSecret: string
): Promise<GraphTokenResponse> {
	const tokenClient = request.define({
		baseUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`,
		timeout: 10_000,
		retry: 2
	});

	return tokenClient.post<GraphTokenResponse>('/token', {
		client_id: clientId,
		client_secret: clientSecret,
		scope: 'https://graph.microsoft.com/.default',
		grant_type: 'client_credentials',
	}, { contentType: 'form' });
}

/**
 * Test Microsoft Entra ID connection
 */
export async function testEntraIDConnection(config: {
	tenantId: string;
	clientId: string;
	clientSecret: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
	try {
		const tokenResponse = await getMicrosoftGraphToken(
			config.tenantId,
			config.clientId,
			config.clientSecret
		);

		const orgData = await graphApi.get<{ value: Array<{ displayName: string }> }>(
			'/organization',
			{ headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
		);

		const orgName = orgData.value?.[0]?.displayName || 'Unknown';
		log.info('Entra ID connection test succeeded', { orgName });

		return {
			success: true,
			message: `Successfully connected to: ${orgName}`,
		};
	} catch (error: any) {
		const message = error instanceof RequestError
			? `Graph API failed: ${error.status} - ${error.statusText}`
			: error.message || 'Unknown error';
		log.error('Entra ID connection test failed', { error: message });
		return { success: false, error: message };
	}
}

/**
 * Get all users from Microsoft Entra ID
 */
export async function getEntraIDUsers(
	accessToken: string,
	nextLink?: string
): Promise<{ users: GraphUser[]; nextLink?: string }> {
	const headers = { Authorization: `Bearer ${accessToken}` };

	// nextLink is a full URL from Microsoft — use raw fetch for pagination
	if (nextLink) {
		const res = await fetch(nextLink, { headers });
		if (!res.ok) {
			throw new Error(`Failed to get users: ${res.status} - ${await res.text()}`);
		}
		const data = await res.json();
		return { users: data.value || [], nextLink: data['@odata.nextLink'] };
	}

	const data = await graphApi.get<{ value: GraphUser[]; '@odata.nextLink'?: string }>(
		'/users',
		{ headers, params: { $top: '999' } }
	);

	return {
		users: data.value || [],
		nextLink: data['@odata.nextLink'],
	};
}

/**
 * Create user in Microsoft Entra ID
 */
export async function createEntraIDUser(
	accessToken: string,
	userData: Partial<GraphUser> & {
		userPrincipalName: string;
		displayName: string;
		mailNickname: string;
		accountEnabled: boolean;
		passwordProfile: {
			forceChangePasswordNextSignIn: boolean;
			password: string;
		};
	}
): Promise<GraphUser> {
	return graphApi.post<GraphUser>('/users', userData, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
}

/**
 * Update user in Microsoft Entra ID
 */
export async function updateEntraIDUser(
	accessToken: string,
	userId: string,
	updates: Partial<GraphUser>
): Promise<void> {
	await graphApi.patch<void>(`/users/${userId}`, updates, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
}

/**
 * Delete user from Microsoft Entra ID
 */
export async function deleteEntraIDUser(
	accessToken: string,
	userId: string
): Promise<void> {
	await graphApi.delete<void>(`/users/${userId}`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
}

/**
 * Map Aksara employee data to Entra ID user format
 */
export function mapEmployeeToEntraUser(
	employee: any,
	fieldMapping: EntraIDConfig['fieldMapping'],
	domain: string = 'yourdomain.com'
): Partial<GraphUser> {
	const mapped: any = {};

	for (const [aksaraField, config] of Object.entries(fieldMapping)) {
		if (!config.enabled) continue;

		const value = employee[aksaraField];
		if (value !== undefined && value !== null) {
			mapped[config.entraField] = value;
		}
	}

	// Ensure required fields
	if (!mapped.userPrincipalName && employee.email) {
		mapped.userPrincipalName = employee.email;
	}

	if (!mapped.displayName) {
		mapped.displayName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
	}

	return mapped;
}
