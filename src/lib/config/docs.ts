/**
 * Documentation configuration
 * Maps URL slugs to markdown files in DOCS/ directory
 */

export interface DocConfig {
	slug: string;
	file: string;
	title: string;
	description: string;
	category: 'integration' | 'admin' | 'api' | 'reference';
	public: boolean; // Whether this doc should be publicly accessible
}

export const DOCS_CONFIG: DocConfig[] = [
	// Integration Guides
	{
		slug: 'client-guide',
		file: 'SSO_CLIENT_GUIDE.md',
		title: 'SSO Client Integration Guide',
		description: 'Complete guide for integrating OAuth 2.0/OIDC with your application',
		category: 'integration',
		public: true
	},
	{
		slug: 'scim-integration',
		file: 'SCIM_COMPLETE_GUIDE.md',
		title: 'SCIM 2.0 API Guide',
		description: 'Complete SCIM 2.0 protocol documentation for employee provisioning',
		category: 'integration',
		public: true
	},
	{
		slug: 'ofm-integration',
		file: 'OFM_SCIM_INTEGRATION_GUIDE.md',
		title: 'OFM SCIM Integration',
		description: 'Tailored integration guide for OFM approval workflow system',
		category: 'integration',
		public: true
	},

	// Administrator Guides
	{
		slug: 'admin-guide',
		file: 'SSO_ADMIN_GUIDE.md',
		title: 'Administrator Guide',
		description: 'System administration, client management, and monitoring',
		category: 'admin',
		public: true
	},

	// API Reference
	{
		slug: 'scim-api',
		file: 'SCIM_IMPLEMENTATION.md',
		title: 'SCIM API Reference',
		description: 'Technical reference for SCIM endpoints and specifications',
		category: 'api',
		public: true
	},

	// Reference & Comparison
	{
		slug: 'scim-comparison',
		file: 'SCIM_INDUSTRY_COMPARISON.md',
		title: 'SCIM Industry Comparison',
		description: 'Feature comparison with Okta, Azure AD, and Google Workspace',
		category: 'reference',
		public: true
	},

	// Internal Documentation (set public: false for restricted access)
	{
		slug: 'security-guide',
		file: 'SECURITY_IMPLEMENTATION_GUIDE.md',
		title: 'Security Implementation Guide',
		description: 'Field-level encryption and compliance details (Internal only)',
		category: 'admin',
		public: false // Keep internal
	},
	{
		slug: 'data-privacy',
		file: 'SUMMARY_DATA_PRIVACY_COMPLIANCE.md',
		title: 'Data Privacy & Compliance',
		description: 'Indonesian data protection compliance (Internal only)',
		category: 'admin',
		public: false // Keep internal
	}
];

/**
 * Get public documentation
 */
export function getPublicDocs(): DocConfig[] {
	return DOCS_CONFIG.filter((doc) => doc.public);
}

/**
 * Get documentation by slug
 */
export function getDocBySlug(slug: string): DocConfig | undefined {
	return DOCS_CONFIG.find((doc) => doc.slug === slug);
}

/**
 * Get documentation grouped by category
 */
export function getDocsByCategory(): Record<string, DocConfig[]> {
	const grouped: Record<string, DocConfig[]> = {
		integration: [],
		admin: [],
		api: [],
		reference: []
	};

	for (const doc of DOCS_CONFIG.filter((d) => d.public)) {
		grouped[doc.category].push(doc);
	}

	return grouped;
}
