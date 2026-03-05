import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import type { Organization } from '$lib/db/schemas';

export interface Branding {
	appName: string;
	logoBase64?: string; // Also used as favicon
	primaryColor: string;
	secondaryColor: string;
	accentColor?: string;
	backgroundColor?: string;
	textColor?: string;
	loginBackgroundBase64?: string;
	emailFromName?: string;
	emailFromAddress?: string;
	supportEmail?: string;
	supportUrl?: string;
}

const DEFAULT_BRANDING: Branding = {
	appName: 'Aksara SSO',
	primaryColor: '#4f46e5', // indigo-600
	secondaryColor: '#7c3aed', // violet-600
	accentColor: '#06b6d4', // cyan-500
	backgroundColor: '#f9fafb', // gray-50
	textColor: '#ffffff',
};

/**
 * Get branding configuration based on OAuth client or default
 *
 * Priority:
 * 1. Client's organization branding (if clientId provided)
 * 2. MASTER/system organization branding
 * 3. Hardcoded default
 */
export async function getBranding(clientId?: string): Promise<Branding> {
	try {
		const db = getDB();

		// 1. Try to get branding from OAuth client's organization
		if (clientId) {
			const client = await db.collection('oauth_clients').findOne({ clientId });

			if (client?.organizationId) {
				const org = await db.collection('organizations').findOne({
					_id: new ObjectId(client.organizationId as string)
				}) as Organization | null;

				if (org?.branding) {
					return mergeBranding(org.branding);
				}
			}
		}

		// 2. Try to get default branding from MASTER organization
		const masterOrg = await db.collection('organizations').findOne({
			code: 'MASTER',
			type: 'system'
		}) as Organization | null;

		if (masterOrg?.branding) {
			return mergeBranding(masterOrg.branding);
		}

		// 3. Return hardcoded default
		return DEFAULT_BRANDING;

	} catch (error) {
		console.error('Error loading branding:', error);
		return DEFAULT_BRANDING;
	}
}

/**
 * Merge organization branding with defaults
 */
function mergeBranding(orgBranding: Partial<Branding>): Branding {
	return {
		...DEFAULT_BRANDING,
		...orgBranding,
	};
}

/**
 * Get branding for a specific organization by ID
 */
export async function getBrandingByOrganization(organizationId: string): Promise<Branding> {
	try {
		const db = getDB();
		const org = await db.collection('organizations').findOne({
			_id: new ObjectId(organizationId)
		}) as Organization | null;

		if (org?.branding) {
			return mergeBranding(org.branding);
		}

		return DEFAULT_BRANDING;
	} catch (error) {
		console.error('Error loading organization branding:', error);
		return DEFAULT_BRANDING;
	}
}

/**
 * Get branding by organization code
 */
export async function getBrandingByCode(code: string): Promise<Branding> {
	try {
		const db = getDB();
		const org = await db.collection('organizations').findOne({
			code: code.toUpperCase()
		}) as Organization | null;

		if (org?.branding) {
			return mergeBranding(org.branding);
		}

		return DEFAULT_BRANDING;
	} catch (error) {
		console.error('Error loading branding by code:', error);
		return DEFAULT_BRANDING;
	}
}

// Re-export getBrandingCSS from branding-utils for backward compatibility
export { getBrandingCSS } from './branding-utils';

// Alias for getBranding - for better naming in different contexts
export { getBranding as getBrandingForClient };
