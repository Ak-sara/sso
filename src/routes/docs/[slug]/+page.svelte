<script lang="ts">
	import type { PageData } from './$types';
	import { getBrandingCSS } from '$lib/branding-utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const branding = $derived(data.branding);
	const brandingCSS = $derived(branding ? getBrandingCSS(branding) : '');
	const appName = $derived(branding?.appName || 'Aksara SSO');
</script>

<svelte:head>
	{#if brandingCSS}
		{@html `<style>${brandingCSS}</style>`}
	{/if}
	{#if branding?.faviconBase64}
		<link rel="icon" href={branding.faviconBase64} />
	{/if}
	<title>{data.title} - {appName} Documentation</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Fixed Top Navigation -->
	<nav class="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-3">
			<div class="flex items-center justify-between">
				<!-- Breadcrumb -->
				<ol class="flex items-center space-x-2 text-sm text-gray-600">
					<li><a href="/docs" class="hover:text-indigo-600 transition-colors">Documentation</a></li>
					<li><span class="mx-2">/</span></li>
					<li class="text-gray-900 font-medium truncate max-w-xs">{data.doc.title}</li>
				</ol>

				<!-- Navigation Actions -->
				<div class="flex items-center gap-4 text-sm">
					<a href="/docs" class="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						All Docs
					</a>
					<span class="text-gray-300">|</span>
					<a href="/login" class="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
						</svg>
						Login
					</a>
					<span class="hidden sm:inline text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
						{data.doc.category}
					</span>
				</div>
			</div>
		</div>
	</nav>

	<div class="max-w-7xl mx-auto px-4 py-8">

		<div class="flex gap-8">
			<!-- Table of Contents (Sidebar) - Sticky with Scroll -->
			{#if data.toc.length > 0}
				<aside class="hidden lg:block w-64 flex-shrink-0">
					<div class="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-8">
						<h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 sticky top-0 bg-gray-50 py-2">
							On This Page
						</h3>
						<nav class="space-y-2">
							{#each data.toc as heading}
								<a
									href="#{heading.id}"
									class="block text-sm text-gray-600 hover:text-indigo-600 transition-colors"
									style="padding-left: {(heading.level - 1) * 12}px"
								>
									{heading.text}
								</a>
							{/each}
						</nav>
					</div>
				</aside>
			{/if}

			<!-- Main Content -->
			<main class="flex-1 min-w-0">
				<article class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 lg:p-12">
					<!-- Document Content -->
					<div class="prose prose-lg max-w-none prose-indigo
						prose-headings:font-bold
						prose-h1:text-4xl prose-h1:mb-8
						prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
						prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
						prose-p:text-gray-700 prose-p:leading-relaxed
						prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
						prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm
						prose-pre:bg-gray-900 prose-pre:text-gray-100
						prose-table:border-collapse prose-table:w-full
						prose-th:bg-gray-100 prose-th:border prose-th:border-gray-300 prose-th:p-2
						prose-td:border prose-td:border-gray-300 prose-td:p-2
						prose-ul:list-disc prose-ul:pl-6
						prose-ol:list-decimal prose-ol:pl-6
						prose-li:text-gray-700
						prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic
					">
						{@html data.html}
					</div>

				</article>
			</main>
		</div>
	</div>
</div>

<style>
	/* Custom styles for code blocks */
	:global(article pre) {
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
	}

	:global(article pre code) {
		background: transparent !important;
		color: inherit !important;
		padding: 0 !important;
	}

	/* Smooth scroll for anchor links */
	:global(html) {
		scroll-behavior: smooth;
	}

	/* Scroll offset for anchor links (account for fixed header) */
	:global(article h1[id]),
	:global(article h2[id]),
	:global(article h3[id]),
	:global(article h4[id]),
	:global(article h5[id]),
	:global(article h6[id]) {
		scroll-margin-top: 6rem;
	}

	/* Custom scrollbar for sidebar */
	aside::-webkit-scrollbar {
		width: 6px;
	}

	aside::-webkit-scrollbar-track {
		background: transparent;
	}

	aside::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 3px;
	}

	aside::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}
</style>
