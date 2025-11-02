<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';
	import { createPanZoom, type PanZoomInstance } from '$lib/utils/pan-zoom';

	let { data }: { data: PageData } = $props();

	// UI State
	let showConfigEditor = $state(false);
	let activeConfigTab = $state<'groups' | 'connections' | 'styles' | 'json'>('groups');
	let activeDiagramTab = $state<'diagram' | 'code'>('diagram');

	// Mermaid config state (deep clone to avoid mutation)
	let config = $state(data.version.mermaidConfig ? JSON.parse(JSON.stringify(data.version.mermaidConfig)) : {
		logicalGroups: [],
		specialConnections: [],
		nodeStyles: {}
	});

	// Live preview diagram
	let previewDiagram = $state(data.version.mermaidDiagram || '');

	// Pan-zoom state
	let diagramContainer: HTMLElement;
	let panzoomInstance: PanZoomInstance | null = null;

	// Node editor state
	let showNodeEditor = $state(false);
	let selectedNode: any = $state(null);
	let isEditable = $state(data.version.status === 'active');
	let parentOptions = $state<Array<{ value: string; label: string }>>([]);

	// Track if initial mount is done
	let isMounted = $state(false);

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
			// Wait a bit longer for mermaid to fully render before initializing pan-zoom
			setTimeout(() => {
				initializePanZoom();
				addNodeClickListeners();
				isMounted = true;
			}, 200);
		}, 100);
	});

	// Re-render diagram when switching back to diagram tab
	$effect(() => {
		if (isMounted && activeDiagramTab === 'diagram') {
			// Small delay to ensure DOM is updated
			setTimeout(() => {
				mermaid.contentLoaded();
				setTimeout(() => {
					initializePanZoom();
					addNodeClickListeners();
				}, 100);
			}, 50);
		}
	});

	// Initialize pan-zoom for mermaid diagram
	function initializePanZoom() {
		if (!diagramContainer) return;

		const preElement = diagramContainer.querySelector('pre.mermaid');
		const svgElement = preElement?.querySelector('svg');

		if (!preElement || !svgElement) return;

		// Style the container
		diagramContainer.style.cursor = 'grab';
		diagramContainer.style.userSelect = 'none';
		diagramContainer.style.overflow = 'hidden';

		// Style the pre element
		preElement.style.margin = '0';
		preElement.style.padding = '0';
		preElement.style.display = 'inline-block';
		preElement.style.transformOrigin = '0 0';
		preElement.style.transition = 'none';

		// Make SVG not capture pointer events EXCEPT on nodes
		svgElement.style.maxWidth = 'none';
		svgElement.style.height = 'auto';
		svgElement.style.pointerEvents = 'none';

		// Only enable pointer events on nodes for clicking
		const nodes = svgElement.querySelectorAll('.node');
		nodes.forEach((node) => {
			(node as HTMLElement).style.pointerEvents = 'auto';
		});

		// Fix mermaid SVG: add proper viewBox by measuring the content
		const containerRect = diagramContainer.getBoundingClientRect();
		svgElement.removeAttribute('width');
		svgElement.style.maxWidth = 'none';
		svgElement.getBoundingClientRect(); // Force layout update

		// Get the true bounding box and add viewBox
		try {
			const bbox = svgElement.getBBox();
			const viewBoxValue = `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
			svgElement.setAttribute('viewBox', viewBoxValue);
			svgElement.setAttribute('width', '100%');
		} catch (e) {
			console.error('Failed to get bbox:', e);
		}

		// Set pre element to container size (SVG will auto-scale via viewBox)
		preElement.style.width = containerRect.width + 'px';
		preElement.style.height = containerRect.height + 'px';

		// Create pan-zoom instance
		panzoomInstance = createPanZoom({
			container: diagramContainer,
			target: preElement,
			initialScale: 1,
			minScale: 0.1,
			maxScale: 10,
			excludeSelector: '.node' // Don't pan when clicking nodes
		});

		// Add node click handling
		diagramContainer.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			const nodeElement = target.closest('.node');

			if (nodeElement) {
				const nodeId = nodeElement.getAttribute('id')?.replace('flowchart-', '').replace(/-[0-9]+$/, '');
				if (nodeId) {
					openNodeEditor(nodeId);
				}
			}
		});
	}

	// Add cursor pointer to nodes
	function addNodeClickListeners() {
		if (!diagramContainer) return;

		// Use event delegation on the container
		diagramContainer.addEventListener('mouseover', (e) => {
			const target = e.target as HTMLElement;
			const nodeElement = target.closest('.node');

			if (nodeElement) {
				diagramContainer.style.cursor = 'pointer';
			}
		});

		diagramContainer.addEventListener('mouseout', (e) => {
			const target = e.target as HTMLElement;
			const nodeElement = target.closest('.node');

			// Only change back to grab if we're leaving a node
			if (nodeElement && !nodeElement.contains(e.relatedTarget as Node)) {
				diagramContainer.style.cursor = 'grab';
			}
		});
	}

	// Open node editor with org unit data
	async function openNodeEditor(nodeCode: string) {
		try {
			// Fetch org unit data
			const response = await fetch(`/api/org-units/${nodeCode}`);
			if (response.ok) {
				selectedNode = await response.json();

				// Convert null parentId to empty string for select binding
				if (selectedNode.parentId === null || selectedNode.parentId === undefined) {
					selectedNode.parentId = '';
				}

				// Load parent options if editable
				if (isEditable) {
					await loadParentOptions(selectedNode._id, data.organization._id);
				}

				showNodeEditor = true;
			} else {
				console.error('Failed to fetch org unit:', nodeCode);
				alert('Unit tidak ditemukan');
			}
		} catch (err) {
			console.error('Error fetching org unit:', err);
			alert('Gagal memuat data unit');
		}
	}

	// Load parent options from API
	async function loadParentOptions(currentUnitId?: string, organizationId?: string) {
		try {
			const params = new URLSearchParams();
			if (currentUnitId) params.set('currentUnitId', currentUnitId);
			if (organizationId) params.set('organizationId', organizationId);

			const url = `/api/org-units/parent-options?${params}`;
			console.log('[STO] Fetching parent options from:', url);

			const response = await fetch(url);
			if (response.ok) {
				const options = await response.json();
				console.log('[STO] ✅ Loaded parent options:', options.length, 'items');
				parentOptions = options;
			} else {
				console.error('[STO] ❌ Failed to fetch parent options:', response.status);
				parentOptions = [];
			}
		} catch (err) {
			console.error('[STO] ❌ Exception loading parent options:', err);
			parentOptions = [];
		}
	}

	// Close node editor
	function closeNodeEditor() {
		showNodeEditor = false;
		selectedNode = null;
	}

	// Save node changes
	async function saveNodeChanges() {
		if (!selectedNode || !isEditable) return;

		try {
			const updateData = {
				name: selectedNode.name,
				unitType: selectedNode.unitType,
				description: selectedNode.description,
				isActive: selectedNode.isActive,
				parentId: selectedNode.parentId === '' ? null : selectedNode.parentId
			};

			const response = await fetch(`/api/org-units/${selectedNode.code}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				alert('Perubahan berhasil disimpan');
				closeNodeEditor();
				// Optionally refresh the page to see updated diagram
				window.location.reload();
			} else {
				alert('Gagal menyimpan perubahan');
			}
		} catch (err) {
			console.error('Error saving org unit:', err);
			alert('Gagal menyimpan perubahan');
		}
	}

	// Zoom controls
	function zoomIn() { panzoomInstance?.zoomIn(); }
	function zoomOut() { panzoomInstance?.zoomOut(); }
	function resetZoom() { panzoomInstance?.reset(); }

	// Regenerate diagram from current config
	async function regeneratePreview() {
		// Reset panzoom instance
		panzoomInstance = null;

		// Re-render existing diagram
		setTimeout(() => {
			mermaid.contentLoaded();
			setTimeout(() => {
				initializePanZoom();
				addNodeClickListeners();
			}, 100);
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
			const response = await fetch(`/api/org-structure-versions/${data.version._id}/save-config`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ config })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to save config');
			}

			const result = await response.json();
			console.log('Save config result:', result);

			if (result.success && result.mermaidDiagram) {
				// Update preview diagram
				previewDiagram = result.mermaidDiagram;

				// Switch to diagram tab to see the result
				activeDiagramTab = 'diagram';

				// Reset panzoom instance
				panzoomInstance = null;

				// Re-render mermaid
				setTimeout(() => {
					mermaid.contentLoaded();
					setTimeout(() => {
						initializePanZoom();
						addNodeClickListeners();
					}, 100);
				}, 100);

				alert('Config saved and diagram regenerated!');
			} else {
				console.error('No mermaidDiagram in response:', result);
				alert('Failed to save config: No diagram returned');
			}
		} catch (err) {
			console.error('Save config error:', err);
			alert('Error saving config: ' + (err instanceof Error ? err.message : String(err)));
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
	<div class="flex h-[calc(100vh-20px)]">
		<div class="flex-1 bg-white shadow-lg rounded-lg overflow-hidden min-h-full relative flex flex-col">
			{#if data.version.mermaidDiagram}
				<!-- Tabs -->
				<div class="border-b bg-gray-50 px-6 pt-4">
					<div class="flex space-x-1">
						<button
							onclick={() => activeDiagramTab = 'diagram'}
							class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors {activeDiagramTab === 'diagram' ? 'bg-white text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}"
						>
							📊 Diagram
						</button>
						<button
							onclick={() => activeDiagramTab = 'code'}
							class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors {activeDiagramTab === 'code' ? 'bg-white text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}"
						>
							📝 Mermaid Code
						</button>
					</div>
				</div>

				<!-- Tab Content -->
				<div class="flex-1 p-6 overflow-auto">
					{#if activeDiagramTab === 'diagram'}
						<!-- Zoom Controls -->
						<div class="absolute top-20 right-8 z-20 flex flex-col gap-2 bg-white shadow-lg rounded-lg p-2 border">
							<button
								onclick={zoomIn}
								class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-lg font-bold"
								title="Zoom In"
							>
								+
							</button>
							<button
								onclick={zoomOut}
								class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-lg font-bold"
								title="Zoom Out"
							>
								−
							</button>
							<button
								onclick={resetZoom}
								class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"
								title="Reset Zoom"
							>
								⟲
							</button>
						</div>

						<!-- Diagram Container with Pan/Zoom -->
						<div
							bind:this={diagramContainer}
							class="border rounded bg-gray-50"
							style="height: calc(100vh - 200px); position: relative; overflow: hidden;"
						>
							<pre class="mermaid">{previewDiagram}</pre>
						</div>
					{:else}
						<!-- Mermaid Code View -->
						<div class="h-full">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-sm font-medium text-gray-700">Mermaid Source Code</h3>
								<button
									onclick={() => {
										navigator.clipboard.writeText(previewDiagram);
										alert('Code copied to clipboard!');
									}}
									class="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
								>
									📋 Copy Code
								</button>
							</div>
							<pre class="text-sm overflow-auto bg-gray-900 text-gray-100 p-4 rounded-lg border border-gray-700 font-mono h-[calc(100vh-280px)]">{previewDiagram}</pre>
						</div>
					{/if}
				</div>
			{:else}
				<div class="p-6">
					<div class="border border-yellow-300 rounded p-4 bg-yellow-50">
						<p class="text-yellow-800 text-sm">
							⚠️ Diagram belum dibuat. Klik <strong>Auto-Generate Config</strong> untuk membuat diagram otomatis.
						</p>
					</div>
				</div>
			{/if}
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

	<!-- Node Editor Modal -->
	{#if showNodeEditor && selectedNode}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onclick={closeNodeEditor}>
			<div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto" onclick={(e) => e.stopPropagation()}>
				<!-- Header -->
				<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
					<div>
						<h3 class="text-xl font-bold">{selectedNode.name}</h3>
						<p class="text-sm text-gray-500">Kode: {selectedNode.code}</p>
					</div>
					<div class="flex items-center gap-2">
						{#if !isEditable}
							<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
								VIEW ONLY (Previous Version)
							</span>
						{/if}
						<button
							onclick={closeNodeEditor}
							class="text-gray-400 hover:text-gray-600 text-2xl"
						>
							×
						</button>
					</div>
				</div>

				<!-- Content -->
				<div class="p-6 space-y-4">
					<!-- Name -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nama Unit</label>
						{#if isEditable}
							<input
								type="text"
								bind:value={selectedNode.name}
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							/>
						{:else}
							<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedNode.name}</p>
						{/if}
					</div>

					<!-- Code -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Kode Unit</label>
						<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{selectedNode.code}</p>
						<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah</p>
					</div>

					<!-- Unit Type -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Tipe Unit</label>
						{#if isEditable}
							<select
								bind:value={selectedNode.unitType}
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							>
								<option value="board">Board</option>
								<option value="directorate">Directorate</option>
								<option value="division">Division</option>
								<option value="department">Department</option>
								<option value="section">Section</option>
								<option value="team">Team</option>
								<option value="sbu">SBU</option>
								<option value="regional">Regional Office</option>
								<option value="station">Station</option>
							</select>
						{:else}
							<p class="px-3 py-2 bg-gray-50 rounded-md capitalize">{selectedNode.unitType}</p>
						{/if}
					</div>

					<!-- Description -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
						{#if isEditable}
							<textarea
								bind:value={selectedNode.description}
								rows="3"
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							></textarea>
						{:else}
							<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedNode.description || '-'}</p>
						{/if}
					</div>

					<!-- Parent Unit -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Parent Unit</label>
						{#if isEditable}
							<select
								bind:value={selectedNode.parentId}
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
								size="1"
							>
								{#each parentOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							<div class="mt-1 text-xs">
								<span class="text-gray-500">
									📊 Total options loaded: <strong>{parentOptions.length}</strong>
								</span>
								<br />
								<span class="text-blue-600">
									Selected: <strong>{selectedNode.parentId || '(none - top level)'}</strong>
								</span>
							</div>
						{:else}
							<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedNode.parentName || 'No Parent (Top Level)'}</p>
						{/if}
					</div>

					<!-- Level -->
					{#if selectedNode.level !== undefined}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
							<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedNode.level}</p>
						</div>
					{/if}

					<!-- Active Status -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
						{#if isEditable}
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									bind:checked={selectedNode.isActive}
									class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
								/>
								<span class="text-sm">Unit Aktif</span>
							</label>
						{:else}
							<p class="px-3 py-2 bg-gray-50 rounded-md">
								{selectedNode.isActive ? '✓ Aktif' : '✗ Tidak Aktif'}
							</p>
						{/if}
					</div>
				</div>

				<!-- Footer -->
				{#if isEditable}
					<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
						<button
							onclick={closeNodeEditor}
							class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							onclick={saveNodeChanges}
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							💾 Save Changes
						</button>
					</div>
				{:else}
					<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
						<button
							onclick={closeNodeEditor}
							class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50"
						>
							Close
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
