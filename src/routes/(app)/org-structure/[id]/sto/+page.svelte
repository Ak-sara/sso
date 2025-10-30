<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';

	let { data }: { data: PageData } = $props();

	// UI State
	let showConfigEditor = $state(false);
	let activeConfigTab = $state<'groups' | 'connections' | 'styles' | 'json'>('groups');

	// Mermaid config state (deep clone to avoid mutation)
	let config = $state(data.version.mermaidConfig ? JSON.parse(JSON.stringify(data.version.mermaidConfig)) : {
		logicalGroups: [],
		specialConnections: [],
		nodeStyles: {}
	});

	// Live preview diagram
	let previewDiagram = $state(data.version.mermaidDiagram || '');

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

	// Regenerate diagram from current config
	async function regeneratePreview() {
		// TODO: Call server action to regenerate with current config
		// For now, just re-render existing diagram
		setTimeout(() => {
			mermaid.contentLoaded();
		}, 100);
	}

	// Add new logical group
	function addLogicalGroup() {
		config.logicalGroups.push({
			id: `GROUP${config.logicalGroups.length + 1}`,
			label: '',
			type: 'positioning',
			direction: 'LR',
			contains: [],
			styling: { transparent: true }
		});
	}

	// Convert contains array to/from string for textarea
	function containsToString(contains: string[]): string {
		return contains.join(', ');
	}

	function stringToContains(str: string): string[] {
		return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
	}

	// Remove logical group
	function removeLogicalGroup(index: number) {
		config.logicalGroups.splice(index, 1);
	}

	// Add special connection
	function addSpecialConnection() {
		config.specialConnections.push({
			from: '',
			to: '',
			type: 'hierarchy'
		});
	}

	// Remove special connection
	function removeSpecialConnection(index: number) {
		config.specialConnections.splice(index, 1);
	}

	// Save config
	async function saveConfig() {
		try {
			const formData = new FormData();
			formData.append('config', JSON.stringify(config));

			const response = await fetch('?/saveConfig', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success' && result.data?.mermaidDiagram) {
				// Update preview diagram
				previewDiagram = result.data.mermaidDiagram;

				// Re-render mermaid
				setTimeout(() => {
					mermaid.contentLoaded();
				}, 100);

				alert('Config saved and diagram regenerated!');
			} else {
				alert('Failed to save config');
			}
		} catch (err) {
			console.error('Save config error:', err);
			alert('Error saving config');
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white shadow-sm border-b sticky top-0 z-10">
		<div class="max-w-full px-6 py-4">
			<div class="flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<a href="/org-structure/{data.version._id}" class="text-gray-500 hover:text-gray-700">
							← Kembali
						</a>
						<h2 class="text-xl font-bold">
							STO - {data.organization.name}
						</h2>
						{#if data.version.status === 'active'}
							<span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
								✓ AKTIF
							</span>
						{/if}
					</div>
					<p class="text-xs text-gray-500 mt-1">
						Version {data.version.versionNumber}: {data.version.versionName}
						• Efektif {new Date(data.version.effectiveDate).toLocaleDateString('id-ID')}
					</p>
				</div>
				<div class="flex items-center space-x-2">
					<button
						onclick={() => showConfigEditor = !showConfigEditor}
						class="px-4 py-2 text-sm {showConfigEditor ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'} rounded-md hover:opacity-90 transition-colors"
					>
						{showConfigEditor ? '📐 Hide Editor' : '📐 Show Config Editor'}
					</button>
					<form method="POST" action="?/generateDefaultConfig" class="inline">
						<button
							type="submit"
							class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
						>
							⚡ Auto-Generate Config
						</button>
					</form>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content: Diagram + Config Editor -->
	<div class="flex h-[calc(100vh-120px)]">
		<!-- Diagram Panel -->
		<div class="flex-1 overflow-auto p-6">
			<div class="bg-white shadow-lg rounded-lg p-6 min-h-full">
				{#if data.version.mermaidDiagram}
					<div class="mb-4">
						<pre class="mermaid">{previewDiagram}</pre>
					</div>
					<details class="mt-4">
						<summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
							📝 View Mermaid Source Code
						</summary>
						<pre class="mt-2 text-xs overflow-x-auto bg-gray-50 p-3 rounded border">{previewDiagram}</pre>
					</details>
				{:else}
					<div class="border border-yellow-300 rounded p-4 bg-yellow-50">
						<p class="text-yellow-800 text-sm">
							⚠️ Diagram belum dibuat. Klik <strong>Auto-Generate Config</strong> untuk membuat diagram otomatis.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Config Editor Panel (Collapsible) -->
		{#if showConfigEditor}
			<div class="w-96 bg-white shadow-2xl border-l overflow-auto">
				<div class="sticky top-0 bg-white border-b z-10">
					<div class="p-4">
						<h3 class="text-lg font-semibold mb-2">Mermaid Config Editor</h3>
						<p class="text-xs text-gray-500 mb-4">
							Edit presentation layer - logical grouping, connections, and styling
						</p>

						<!-- Tabs -->
						<div class="flex space-x-2 text-sm">
							<button
								onclick={() => activeConfigTab = 'groups'}
								class="px-3 py-1.5 rounded {activeConfigTab === 'groups' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}"
							>
								Groups
							</button>
							<button
								onclick={() => activeConfigTab = 'connections'}
								class="px-3 py-1.5 rounded {activeConfigTab === 'connections' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}"
							>
								Connections
							</button>
							<button
								onclick={() => activeConfigTab = 'styles'}
								class="px-3 py-1.5 rounded {activeConfigTab === 'styles' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}"
							>
								Styles
							</button>
							<button
								onclick={() => activeConfigTab = 'json'}
								class="px-3 py-1.5 rounded {activeConfigTab === 'json' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}"
							>
								JSON
							</button>
						</div>
					</div>
				</div>

				<div class="p-4 space-y-4">
					<!-- Logical Groups Tab -->
					{#if activeConfigTab === 'groups'}
						<div>
							<div class="flex items-center justify-between mb-3">
								<h4 class="text-sm font-medium text-gray-700">Logical Groups</h4>
								<button
									onclick={addLogicalGroup}
									class="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
								>
									+ Add Group
								</button>
							</div>

							{#if config.logicalGroups.length === 0}
								<p class="text-xs text-gray-500 italic">No logical groups defined</p>
							{:else}
								<div class="space-y-3">
									{#each config.logicalGroups as group, i}
										<div class="border rounded p-3 bg-gray-50">
											<div class="flex items-center justify-between mb-2">
												<input
													type="text"
													bind:value={group.id}
													placeholder="Group ID"
													class="text-sm font-mono px-2 py-1 border rounded w-32"
												/>
												<button
													onclick={() => removeLogicalGroup(i)}
													class="text-red-600 hover:text-red-800 text-xs"
												>
													🗑️
												</button>
											</div>
											<input
												type="text"
												bind:value={group.label}
												placeholder="Label (optional)"
												class="text-xs px-2 py-1 border rounded w-full mb-2"
											/>
											<div class="grid grid-cols-2 gap-2 mb-2">
												<select bind:value={group.type} class="text-xs px-2 py-1 border rounded">
													<option value="wrapper">Wrapper</option>
													<option value="positioning">Positioning</option>
													<option value="alignment">Alignment</option>
												</select>
												<select bind:value={group.direction} class="text-xs px-2 py-1 border rounded">
													<option value="TB">TB ↓</option>
													<option value="LR">LR →</option>
													<option value="RL">RL ←</option>
													<option value="BT">BT ↑</option>
												</select>
											</div>
											<textarea
												value={containsToString(group.contains)}
												oninput={(e) => group.contains = stringToContains(e.currentTarget.value)}
												placeholder="Unit codes (comma-separated)"
												class="text-xs px-2 py-1 border rounded w-full h-16 font-mono"
											></textarea>
											<label class="flex items-center mt-2 text-xs">
												<input
													type="checkbox"
													checked={group.styling?.transparent || false}
													onchange={(e) => {
														if (!group.styling) group.styling = { transparent: false };
														group.styling.transparent = e.currentTarget.checked;
													}}
													class="mr-2"
												/>
												Transparent
											</label>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Special Connections Tab -->
					{#if activeConfigTab === 'connections'}
						<div>
							<div class="flex items-center justify-between mb-3">
								<h4 class="text-sm font-medium text-gray-700">Special Connections</h4>
								<button
									onclick={addSpecialConnection}
									class="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
								>
									+ Add Connection
								</button>
							</div>

							{#if config.specialConnections.length === 0}
								<p class="text-xs text-gray-500 italic">No special connections defined</p>
							{:else}
								<div class="space-y-3">
									{#each config.specialConnections as conn, i}
										<div class="border rounded p-3 bg-gray-50">
											<div class="flex items-center justify-between mb-2">
												<span class="text-xs font-medium text-gray-600">Connection {i + 1}</span>
												<button
													onclick={() => removeSpecialConnection(i)}
													class="text-red-600 hover:text-red-800 text-xs"
												>
													🗑️
												</button>
											</div>
											<input
												type="text"
												bind:value={conn.from}
												placeholder="From (unit code)"
												class="text-xs px-2 py-1 border rounded w-full mb-2 font-mono"
											/>
											<input
												type="text"
												bind:value={conn.to}
												placeholder="To (unit code)"
												class="text-xs px-2 py-1 border rounded w-full mb-2 font-mono"
											/>
											<select bind:value={conn.type} class="text-xs px-2 py-1 border rounded w-full">
												<option value="hierarchy">Hierarchy (→)</option>
												<option value="matrix">Matrix (-.→)</option>
												<option value="alignment">Alignment (~~~)</option>
											</select>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Node Styles Tab -->
					{#if activeConfigTab === 'styles'}
						<div>
							<h4 class="text-sm font-medium text-gray-700 mb-3">Node Styles</h4>
							<p class="text-xs text-gray-500 italic">
								Coming soon - define custom colors and shapes per unit
							</p>
						</div>
					{/if}

					<!-- JSON Editor Tab -->
					{#if activeConfigTab === 'json'}
						<div>
							<h4 class="text-sm font-medium text-gray-700 mb-3">Raw JSON</h4>
							<textarea
								value={JSON.stringify(config, null, 2)}
								class="w-full h-96 text-xs font-mono px-3 py-2 border rounded bg-gray-50"
								readonly
							></textarea>
						</div>
					{/if}
				</div>

				<!-- Save Button -->
				<div class="sticky bottom-0 bg-white border-t p-4">
					<button
						onclick={saveConfig}
						class="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
					>
						💾 Save & Regenerate
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
