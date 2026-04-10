import { error } from '@sveltejs/kit';
import { getDocBySlug } from '$lib/config/docs';
import { parseMarkdown, extractTitle, generateTOC } from '$lib/utils/markdown';
import { getBranding } from '$lib/branding';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PageServerLoad } from './$types';
import { useLogger } from '@ak-sara/fbao/foundation';

const log = useLogger({ module: 'docs' });

export const load: PageServerLoad = async ({ params, locals }) => {
	const clientId = locals.query?.client_id || undefined;
	const branding = await getBranding(clientId);

	const docConfig = getDocBySlug(params.slug);

	// Check if doc exists
	if (!docConfig) {
		throw error(404, 'Documentation not found');
	}

	// Check if doc is public
	if (!docConfig.public) {
		throw error(403, 'This documentation is not publicly accessible');
	}

	// Read markdown file
	const docsPath = join(process.cwd(), 'DOCS', docConfig.file);
	let markdown: string;

	try {
		markdown = readFileSync(docsPath, 'utf-8');
	} catch (err) {
		log.error('Error reading doc file', { error: err });
		throw error(500, 'Failed to load documentation');
	}

	// Parse markdown
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
