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
	const logoSrc = $derived(branding?.logoBase64 || '/ias-logo.png');

	const categoryLabels = {
		integration: 'Integration Guides',
		admin: 'Administrator Guides',
		compliance: 'Compliance',
		reference: 'Reference & Comparison'
	};

	const categoryIcons = {
		integration: '🔗',
		admin: '⚙️',
		api: '📡',
		reference: '📚'
	};
</script>

<svelte:head>
	{#if brandingCSS}
		{@html `<style>${brandingCSS}</style>`}
	{/if}
	{#if branding?.faviconBase64}
		<link rel="icon" href={branding.faviconBase64} />
	{/if}
	<title>Documentation - {appName}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-12" style={branding?.primaryColor ? `background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor || branding.primaryColor} 100%);` : ''}>
	<div class="max-w-6xl mx-auto px-4">
		<!-- Header -->
		<div class="text-center mb-12">
			{#if logoSrc}
				<div class="inline-flex items-center justify-center mb-6">
					<img src={logoSrc} alt="{appName} Logo" class="h-20 object-contain" />
				</div>
			{/if}
			<h1 class="text-4xl font-bold text-white mb-4">{appName} Documentation</h1>
			<p class="text-xl text-white/90">
				Complete guides for integrating and managing your SSO system
			</p>
		</div>

		<!-- Documentation Grid -->
		<div class="space-y-12">
			{#each Object.entries(data.docsByCategory) as [category, docs]}
				{#if docs.length > 0}
					<section>
						<h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
							<span>{categoryIcons[category]}</span>
							{categoryLabels[category]}
						</h2>

						<div class="grid md:grid-cols-2 gap-6">
							{#each docs as doc}
								<a
									href="/docs/{doc.slug}"
									class="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200 hover:border-indigo-300"
								>
									<h3 class="text-xl font-semibold text-gray-900 mb-2">
										{doc.title}
									</h3>
									<p class="text-gray-600 text-sm">
										{doc.description}
									</p>
									<div class="mt-4 flex items-center text-indigo-600 text-sm font-medium">
										Read guide
										<svg
											class="w-4 h-4 ml-1"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</div>
								</a>
							{/each}
						</div>
					</section>
				{/if}
			{/each}
		</div>

		<!-- Footer -->
		<div class="mt-16 text-center">
			<a href="/" class="inline-flex items-center gap-2 text-white hover:text-white/80 font-medium bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg transition-all">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
				</svg>
				Back
			</a>
			<p class="mt-4 text-white/80 text-sm">Need help? Contact your system administrator</p>
		</div>
	</div>
</div>
