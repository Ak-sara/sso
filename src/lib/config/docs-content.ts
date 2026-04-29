import authenticationGuide from '../../../DOCS/AUTHENTICATION_GUIDE.md?raw';
import scimCompleteGuide from '../../../DOCS/SCIM_COMPLETE_GUIDE.md?raw';
import ofmScimGuide from '../../../DOCS/OFM_SCIM_INTEGRATION_GUIDE.md?raw';
import kebijakan from '../../../DOCS/KEBIJAKAN_PRIVASI_TEMPLATE.md?raw';
import dataCompliance from '../../../DOCS/DATA_PRIVACY_COMPLIANCE.md?raw';
import securityGuide from '../../../DOCS/SECURITY_IMPLEMENTATION_GUIDE.md?raw';

const DOC_CONTENTS: Record<string, string> = {
	'AUTHENTICATION_GUIDE.md': authenticationGuide,
	'SCIM_COMPLETE_GUIDE.md': scimCompleteGuide,
	'OFM_SCIM_INTEGRATION_GUIDE.md': ofmScimGuide,
	'KEBIJAKAN_PRIVASI_TEMPLATE.md': kebijakan,
	'DATA_PRIVACY_COMPLIANCE.md': dataCompliance,
	'SECURITY_IMPLEMENTATION_GUIDE.md': securityGuide
};

export function getDocContent(filename: string): string | undefined {
	return DOC_CONTENTS[filename];
}
