<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';

	let { data }: { data: PageData } = $props();

	// Initialize Mermaid
	onMount(() => {
		mermaid.initialize({
			startOnLoad: true,
			theme: 'default',
			flowchart: {
				useMaxWidth: true,
				htmlLabels: true,
				curve: 'basis'
			}
		});

		// Render diagrams after mount
		setTimeout(() => {
			mermaid.contentLoaded();
		}, 100);
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center space-x-3">
				<a href="/org-structure/{data.organization._id}" class="text-gray-500 hover:text-gray-700">
					← Kembali
				</a>
				<h2 class="text-2xl font-bold">
					STO - {data.organization.name}
				</h2>
				{#if data.version.status === 'active'}
					<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
						✓ AKTIF
					</span>
				{/if}
			</div>
			<p class="text-sm text-gray-500 mt-1">
				Version {data.version.versionNumber}: {data.version.versionName}
				• Efektif {new Date(data.version.effectiveDate).toLocaleDateString('id-ID')}
				{#if data.version.skNumber}
					• SK: {data.version.skNumber}
				{/if}
			</p>
		</div>
	</div>

	<!-- Mermaid Diagram -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex justify-between items-center mb-4">
			<h3 class="text-lg font-medium">Diagram Struktur Organisasi</h3>
			<form method="POST" action="?/regenerateMermaid">
				<button
					type="submit"
					class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
				>
					🔄 Regenerate Diagram
				</button>
			</form>
		</div>

		{#if data.version.mermaidDiagram}
			<div class="border rounded p-4 bg-gray-50 mb-4">
				<div class="mb-4">
					<pre class="mermaid text-sm">{data.version.mermaidDiagram}</pre>
				</div>
				<details class="mt-4">
					<summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
						📝 View Mermaid Source Code
					</summary>
					<pre class="mt-2 text-xs overflow-x-auto bg-white p-3 rounded border">{data.version.mermaidDiagram}</pre>
				</details>
			</div>
		{:else}
			<div class="border border-yellow-300 rounded p-4 bg-yellow-50 mb-4">
				<p class="text-yellow-800 text-sm">
					⚠️ Diagram belum dibuat. Klik tombol <strong>Regenerate Diagram</strong> di atas untuk generate otomatis.
				</p>
			</div>
		{/if}
	</div>
</div>
