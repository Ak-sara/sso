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
	<button
		onclick={() => notif.dismiss()}
		class="fixed bottom-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium cursor-pointer
			{notif.value.type === 'success' ? 'bg-green-600' : notif.value.type === 'error' ? 'bg-red-600' : notif.value.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-600'}">
		{notif.value.type === 'success' ? '✓' : notif.value.type === 'error' ? '✕' : notif.value.type === 'warning' ? '⚠' : 'ℹ'} {notif.value.message}
	</button>
{/if}