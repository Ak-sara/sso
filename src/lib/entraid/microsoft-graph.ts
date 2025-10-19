/**
 * Microsoft Graph API Client
 * For syncing with Microsoft Entra ID (formerly Azure AD)
 */

import type { EntraIDConfig } from '$lib/db/schemas';

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

/**
 * Get OAuth 2.0 access token from Microsoft Entra ID
 */
export async function getMicrosoftGraphToken(
	tenantId: string,
	clientId: string,
	clientSecret: string
): Promise<GraphTokenResponse> {
	const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

	const response = await fetch(tokenEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			scope: 'https://graph.microsoft.com/.default',
			grant_type: 'client_credentials',
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get token: ${response.status} - ${error}`);
	}

	return await response.json();
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
		// Get access token
		const tokenResponse = await getMicrosoftGraphToken(
			config.tenantId,
			config.clientId,
			config.clientSecret
		);

		// Test API call: get organization details
		const orgResponse = await fetch('https://graph.microsoft.com/v1.0/organization', {
			headers: {
				Authorization: `Bearer ${tokenResponse.access_token}`,
			},
		});

		if (!orgResponse.ok) {
			const error = await orgResponse.text();
			return {
				success: false,
				error: `Graph API failed: ${orgResponse.status} - ${error}`,
			};
		}

		const orgData = await orgResponse.json();
		const orgName = orgData.value?.[0]?.displayName || 'Unknown';

		return {
			success: true,
			message: `Successfully connected to: ${orgName}`,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Unknown error',
		};
	}
}

/**
 * Get all users from Microsoft Entra ID
 */
export async function getEntraIDUsers(
	accessToken: string,
	nextLink?: string
): Promise<{ users: GraphUser[]; nextLink?: string }> {
	const url = nextLink || 'https://graph.microsoft.com/v1.0/users?$top=999';

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get users: ${response.status} - ${error}`);
	}

	const data = await response.json();

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
	const response = await fetch('https://graph.microsoft.com/v1.0/users', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(userData),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create user: ${response.status} - ${error}`);
	}

	return await response.json();
}

/**
 * Update user in Microsoft Entra ID
 */
export async function updateEntraIDUser(
	accessToken: string,
	userId: string,
	updates: Partial<GraphUser>
): Promise<void> {
	const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(updates),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update user: ${response.status} - ${error}`);
	}
}

/**
 * Delete user from Microsoft Entra ID
 */
export async function deleteEntraIDUser(
	accessToken: string,
	userId: string
): Promise<void> {
	const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to delete user: ${response.status} - ${error}`);
	}
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
