<script lang="ts">
	import type { LayoutData } from './$types';
	import { getBrandingCSS } from '$lib/branding-utils';

	interface Props {
		data: LayoutData;
	}

	let { data }: Props = $props();

	const branding = $derived(data.branding);
	const brandingCSS = $derived(branding ? getBrandingCSS(branding) : '');

	// Create background style based on branding
	const backgroundStyle = $derived(() => {
		if (branding?.loginBackgroundBase64) {
			return `background-image: url('${branding.loginBackgroundBase64}'); background-size: cover; background-position: center;`;
		} else if (branding?.primaryColor && branding?.secondaryColor) {
			return `background: linear-gradient(to bottom right, ${branding.primaryColor}, ${branding.secondaryColor});`;
		}
		// Default gradient
		return 'background: linear-gradient(to bottom right, #4f46e5, #7c3aed, #ec4899);';
	});
</script>

<svelte:head>
	{#if brandingCSS}
		{@html `<style>${brandingCSS}</style>`}
	{/if}
	{#if branding?.faviconBase64}
		<link rel="icon" href={branding.faviconBase64} />
	{/if}
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4" style={backgroundStyle()}>
	<slot />
</div>
