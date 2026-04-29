import { error } from '@sveltejs/kit';
import { getDocBySlug } from '$lib/config/docs';
import { getDocContent } from '$lib/config/docs-content';
import { parseMarkdown, extractTitle, generateTOC } from '$lib/utils/markdown';
import { getBranding } from '$lib/branding';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const clientId = locals.query?.client_id || undefined;
	const branding = await getBranding(clientId);

	const docConfig = getDocBySlug(params.slug);

	if (!docConfig) {
		throw error(404, 'Documentation not found');
	}

	if (!docConfig.public) {
		throw error(403, 'This documentation is not publicly accessible');
	}

	const markdown = getDocContent(docConfig.file);
	if (!markdown) {
		throw error(500, 'Failed to load documentation');
	}

	const html = parseMarkdown(markdown);
	const title = extractTitle(markdown) || docConfig.title;
	const toc = generateTOC(markdown);

	return {
		doc: docConfig,
		html,
		title,
		toc,
		branding
	};
};
