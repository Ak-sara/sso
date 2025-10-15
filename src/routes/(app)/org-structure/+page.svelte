<script lang="ts">
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';

	let mermaidCode = `flowchart TD
    subgraph BOD[Board of Directors]
        direction TB
        DU[Direktur Utama] --> DC[Direktur Komersial]
        DU --> DO[Direktur Operasi]
        DU--> DR[Direktur Resiko]
        DU --> DK[Direktur Keuangan]
        DU--> DH[Direktur SDM]
    end
    BOD --> DDB[Direktorat Dukungan Bisnis]
    BOD --> SBUCL[SBU Cargo & Logistics]
    DC -.-> SBUCL

    DK --> DDK[Direktorat Keuangan]
    DC --> DDC[Direktorat Komersial]
    DO --> DDO[Direktorat Operasi]
    DR --> DDR[Direktorat Resiko]
    DH --> DDH[Direktorat SDM]

    classDef default fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#fff;
    classDef board fill:#10b981,stroke:#059669,stroke-width:3px,color:#fff;
    class BOD board;`;

	let diagramElement: HTMLDivElement;

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

		renderDiagram();
	});

	async function renderDiagram() {
		if (diagramElement) {
			const { svg } = await mermaid.render('orgChart', mermaidCode);
			diagramElement.innerHTML = svg;
		}
	}

	function handleCodeChange() {
		renderDiagram();
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Struktur Organisasi IAS</h2>
		<p class="text-sm text-gray-500">Visualisasi struktur organisasi menggunakan diagram mermaid</p>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button class="border-b-2 border-indigo-500 text-indigo-600 py-4 px-1 text-sm font-medium">
				Diagram
			</button>
			<button class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
				Edit Kode
			</button>
		</nav>
	</div>

	<!-- Diagram View -->
	<div class="bg-white shadow rounded-lg p-6 overflow-x-auto">
		<div bind:this={diagramElement} class="flex justify-center"></div>
	</div>

	<!-- Code Editor (Hidden by default) -->
	<div class="hidden bg-white shadow rounded-lg p-6">
		<label class="block text-sm font-medium text-gray-700 mb-2">Mermaid Code</label>
		<textarea
			bind:value={mermaidCode}
			onblur={handleCodeChange}
			rows="15"
			class="w-full font-mono text-sm p-4 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
		></textarea>
		<button
			onclick={renderDiagram}
			class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
			Render Ulang
		</button>
	</div>

	<!-- Organization Units List -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Daftar Unit Organisasi</h3>
		<div class="space-y-2">
			<div class="flex items-center p-3 bg-gray-50 rounded">
				<span class="text-2xl mr-3">🏛️</span>
				<div>
					<p class="font-medium">Board of Directors (BOD)</p>
					<p class="text-sm text-gray-500">Level 0 - Executive Board</p>
				</div>
			</div>
			<div class="flex items-center p-3 bg-gray-50 rounded">
				<span class="text-2xl mr-3">👔</span>
				<div>
					<p class="font-medium">Direktur Utama (DU)</p>
					<p class="text-sm text-gray-500">Level 1 - President Director</p>
				</div>
			</div>
			<div class="flex items-center p-3 bg-gray-50 rounded">
				<span class="text-2xl mr-3">💼</span>
				<div>
					<p class="font-medium">Direktorat Keuangan (DDK)</p>
					<p class="text-sm text-gray-500">Level 2 - Finance Directorate</p>
				</div>
			</div>
		</div>
	</div>
</div>
