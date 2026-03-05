/**
 * Documentation configuration
 * Maps URL slugs to markdown files in DOCS/ directory
 */

export interface DocConfig {
	slug: string;
	file: string;
	title: string;
	description: string;
	category: 'integration' | 'admin' | 'compliance' | 'reference';
	public: boolean; // Whether this doc should be publicly accessible
}

export const DOCS_CONFIG: DocConfig[] = [
	// Integration Guides
	{
		slug: 'authentication',
		file: 'AUTHENTICATION_GUIDE.md',
		title: 'Authentication Guide',
		description: 'OAuth 2.0/OIDC integration and authentication flows',
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

	// Compliance (Public)
	{
		slug: 'privacy-policy',
		file: 'KEBIJAKAN_PRIVASI_TEMPLATE.md',
		title: 'Privacy Policy Template',
		description: 'Data privacy policy template compliant with UU PDP No. 27/2022',
		category: 'compliance',
		public: true
	},
	{
		slug: 'data-compliance',
		file: 'DATA_PRIVACY_COMPLIANCE.md',
		title: 'Data Privacy & Compliance',
		description: 'UU PDP compliance guide and implementation roadmap',
		category: 'compliance',
		public: true
	},

	// Internal Documentation (restricted access)
	{
		slug: 'security-guide',
		file: 'SECURITY_IMPLEMENTATION_GUIDE.md',
		title: 'Security Implementation Guide',
		description: 'Field-level encryption and compliance details (Internal only)',
		category: 'admin',
		public: false
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
		compliance: [],
		reference: []
	};

	for (const doc of DOCS_CONFIG.filter((d) => d.public)) {
		grouped[doc.category].push(doc);
	}

	return grouped;
}
