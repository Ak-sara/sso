<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { notif } from '$lib/stores/notif.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<main>
	{@render children()}
</main>

{#if notif.value}
	<div
		class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium max-w-sm
			{notif.value.type === 'success' ? 'bg-green-600' : notif.value.type === 'error' ? 'bg-red-600' : notif.value.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-600'}">
		<span>{notif.value.type === 'success' ? '✓' : notif.value.type === 'error' ? '✕' : notif.value.type === 'warning' ? '⚠' : 'ℹ'}</span>
		<span class="flex-1">{notif.value.message}</span>
		<button onclick={() => notif.dismiss()} class="ml-1 opacity-70 hover:opacity-100 leading-none text-lg" aria-label="Dismiss">×</button>
	</div>
{/if}