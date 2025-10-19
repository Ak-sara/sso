import { marked } from 'marked';

/**
 * Configure marked renderer to add IDs to headings
 */
const renderer = new marked.Renderer();
renderer.heading = function ({ text, depth }: { text: string; depth: number }) {
	const id = text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-');
	return `<h${depth} id="${id}">${text}</h${depth}>`;
};

marked.setOptions({ renderer });

/**
 * Parse markdown to HTML
 * Note: We trust the markdown files from DOCS/ directory
 * DOMPurify is not needed since we control the source files
 */
export function parseMarkdown(markdown: string): string {
	const rawHtml = marked.parse(markdown) as string;
	return rawHtml;
}

/**
 * Extract title from markdown (first # heading)
 */
export function extractTitle(markdown: string): string | null {
	const match = markdown.match(/^#\s+(.+)$/m);
	return match ? match[1] : null;
}

/**
 * Generate table of contents from markdown headings
 */
export function generateTOC(markdown: string): Array<{ level: number; text: string; id: string }> {
	const headings: Array<{ level: number; text: string; id: string }> = [];
	const lines = markdown.split('\n');

	for (const line of lines) {
		const match = line.match(/^(#{1,6})\s+(.+)$/);
		if (match) {
			const level = match[1].length;
			const text = match[2];
			const id = text
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-');

			headings.push({ level, text, id });
		}
	}

	return headings;
}
