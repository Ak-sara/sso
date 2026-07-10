<script lang="ts">
	import type { PageData } from './$types';
	import OrgUnitModal from './../../../org-units/OrgUnitModal.svelte';
	import { onMount, setContext } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import G    from '$lib/components/org-chart/svg_g.svelte';
	import Node from '$lib/components/org-chart/svg_node.svelte';
	import Line from '$lib/components/org-chart/svg_path.svelte';
	import { REGISTRY_CTX, type Registry, type NodeRef } from '$lib/components/org-chart/registry';
	import { buildLayout, type NodeDef } from '$lib/components/org-chart/layout';
	import { createPanZoom, type PanZoomInstance } from '$lib/utils/pan-zoom';
	import { useLogger } from '$lib/logger';
	import { showNotif } from '$lib/stores/notif.svelte';

	const log = useLogger({ module: 'app:org-sto' });

	let { data }: { data: PageData } = $props();

	const _reg = new Map<string, NodeRef>();
	const registry: Registry = {
		register:   (k, ref) => _reg.set(k, ref),
		unregister: (k)      => _reg.delete(k),
		get:        (k)      => _reg.get(k),
	};
	setContext(REGISTRY_CTX, registry);

	// ── Map org units → chart NodeDef ─────────────────────────────────────────
	// groupCode → group, picCode → below, always. isNeck switches parentCode
	// from a normal parent link (blue) to a neck link (orange, floating).
	function toNodeDef(u: any): NodeDef {
		const def: NodeDef = { name: u.code, label: u.name };
		if (u.groupCode) def.group = u.groupCode;
		if (u.picCode)   def.below = u.picCode;
		if (u.parentCode) {
			if (u.isNeck) def.neck   = u.parentCode;
			else          def.parent = u.parentCode;
		}
		return def;
	}
	const nodeDefs: NodeDef[] = data.orgUnitsEnriched.map(toNodeDef);
	const { groups, standalones, connections } = buildLayout(nodeDefs);

	log.debug('STO chart data loaded', { units: nodeDefs.length });

	// ── Tree view: resolve children from the flat structure (parent > group > below > neck)
	const isGroupHeader = (name: string) => nodeDefs.some(m => m.group === name);
	function childrenOf(name: string): NodeDef[] {
		return nodeDefs.filter(d =>
			d.parent === name ||
			(d.group === name && !d.parent) ||
			d.below === name ||
			d.neck === name
		);
	}
	const treeRoots = nodeDefs.filter(d => !d.parent && !d.group && !d.below && !d.neck);
	const labelOf = (name?: string) => nodeDefs.find(d => d.name === name)?.label ?? name;

	function section(id: string) {
		document.querySelectorAll('#wrapper>div').forEach(d => d.classList.add('hidden'));
		document.getElementById(id)?.classList.remove('hidden');
	}

	// ── Pan/zoom + click-to-edit ──────────────────────────────────────────────
	let chartEl: HTMLDivElement;
	let viewportEl: SVGGElement;
	let panZoom: PanZoomInstance | undefined;

	onMount(() => {
		panZoom = createPanZoom({
			container: chartEl,
			target: viewportEl as unknown as HTMLElement,
			ctrlWheelZoom: true,
		});
		return () => panZoom?.destroy();
	});

	function onChartClick(e: MouseEvent) {
		const target = (e.target as Element).closest('[data-id]');
		const code = target?.getAttribute('data-id');
		if (code) openNodeEditor(code);
	}

	// ── Hover: highlight every connector line touching the hovered node/group ─
	let hoveredKey: string | null = $state(null);

	// ── Node editor ───────────────────────────────────────────────────────────
	let selectedNode: any = $state(null);

	function unitToFormData(unit: any): FormData {
		const f = new FormData();
		const skip = new Set(['parentName', 'groupName', 'picName', 'managerName']);
		for (const [key, val] of Object.entries(unit))
			if (!skip.has(key) && val !== null && val !== undefined)
				f.append(key, String(val));
		return f;
	}

	async function openNodeEditor(nodeCode: string) {
		try {
			const response = await fetch(`/api/org-units/${nodeCode}`);
			if (!response.ok) { showNotif('error', 'Unit not found'); return; }
			selectedNode = await response.json();
		} catch (err) {
			log.error('Error loading node', { error: err });
			showNotif('error', 'Failed to load unit');
		}
	}

	async function saveNodeChanges() {
		if (!selectedNode) return;
		try {
			const response = await fetch('?/update', { method: 'POST', body: unitToFormData(selectedNode) });
			const result = await response.json();
			if (result.type === 'failure') { showNotif('error', result.data?.error ?? 'Failed to save'); return; }
			showNotif('success', 'Changes saved');
			selectedNode = null;
			await invalidateAll();
		} catch (err) {
			log.error('Error saving node', { error: err });
			showNotif('error', 'Failed to save changes');
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<div class="bg-white shadow-sm border-b sticky top-0 z-10">
		<div class="px-6 py-4 flex items-center justify-between">
			<div>
				<div class="flex items-center space-x-3">
					<a href="/org-structure/{data.version._id}" class="text-gray-500 hover:text-gray-700">← Kembali</a>
					<h2 class="text-xl font-bold">STO — {data.organization.name}</h2>
					{#if data.version.status === 'active'}
						<span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">✓ AKTIF</span>
					{/if}
				</div>
				<p class="text-xs text-gray-500 mt-1">
					Version {data.version.versionNumber}: {data.version.versionName}
					• Efektif {new Date(data.version.effectiveDate).toLocaleDateString('id-ID')}
					• {data.orgUnitsEnriched.length} unit
				</p>
			</div>
			<ul class="chart-menu flex gap-2 text-sm">
				<li onclick={() => section('chart')} class="hover:text-emerald-600 cursor-pointer border rounded px-2 py-1">Chart</li>
				<li onclick={() => section('tree')} class="hover:text-emerald-600 cursor-pointer border rounded px-2 py-1">Tree View</li>
			</ul>
		</div>
	</div>

	<div id="wrapper" class="flex-1 overflow-auto bg-white">
		<div id="chart" class="relative overflow-hidden cursor-grab" bind:this={chartEl} style="height:calc(100vh - 80px)">
			<div class="absolute top-2 right-2 z-10 flex gap-1">
				<button class="border px-2 bg-white hover:text-emerald-600" title="Zoom in" onclick={() => panZoom?.zoomIn()}>+</button>
				<button class="border px-2 bg-white hover:text-emerald-600" title="Zoom out" onclick={() => panZoom?.zoomOut()}>−</button>
				<button class="border px-2 bg-white hover:text-emerald-600" title="Reset" onclick={() => panZoom?.reset()}>⟲</button>
			</div>
			<svg class="border w-full h-full" onclick={onChartClick}>
				<g bind:this={viewportEl} style="transform-origin:0 0;">
				{#each groups as g}
					<G x={g.x} y={g.y} W={g.w} H={g.h} label={g.label} key={g.key}
					has_parent={g.has_parent} is_below={g.is_below} has_below={g.has_below} has_child={g.has_child} has_neck={g.has_neck}
					hovered={hoveredKey === g.key} onnodeenter={(k) => hoveredKey = k} onnodeleave={() => hoveredKey = null}>
						{#each g.nodes as node}
							<Node x={node.lx} y={node.ly} absX={node.absX} absY={node.absY}
								name={node.name} label={node.label} key={node.key}
								has_parent={node.has_parent} has_child={node.has_child} has_below={node.has_below}
								is_below={node.is_below} has_neck={node.has_neck} is_stack_child={node.is_stack_child}
								hovered={hoveredKey === node.key} onnodeenter={(k) => hoveredKey = k} onnodeleave={() => hoveredKey = null} />
						{/each}
					</G>
				{/each}

				{#each standalones as n}
					<Node x={n.x} y={n.y} absX={n.x} absY={n.y} name={n.name} label={n.label} key={n.key}
						has_parent={n.has_parent} has_child={n.has_child} has_below={n.has_below} is_below={n.is_below} has_neck={n.has_neck} l_neck={n.l_neck} is_stack_child={n.is_stack_child}
						hovered={hoveredKey === n.key} onnodeenter={(k) => hoveredKey = k} onnodeleave={() => hoveredKey = null} />
				{/each}

				{#each connections as c}
					<Line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} type={c.type} pathStyle={c.pathStyle}
						highlighted={hoveredKey !== null && (c.fromKey === hoveredKey || c.toKey === hoveredKey)}
						dimmed={hoveredKey !== null && c.fromKey !== hoveredKey && c.toKey !== hoveredKey} />
				{/each}
				</g>
			</svg>
		</div>

		<div id="tree" class="hidden w-full h-full p-4">
			{#snippet nodeLabel(n: NodeDef)}
				<button type="button" class="text-left hover:text-emerald-600" onclick={() => openNodeEditor(n.name)}>
					<span class="font-medium">{isGroupHeader(n.name) ? '📁' : '📄'} {n.label}</span>
					<span class="text-xs text-gray-400">({n.name})</span>
				</button>
				{#if n.neck}<span class="text-xs text-orange-500 border border-orange-400 rounded px-1">neck</span>{/if}
				{#if n.below}<span class="text-xs text-green-600 border border-green-400 rounded px-1">below → {labelOf(n.below)}</span>{/if}
				{#if n.parent && !n.group}<span class="text-xs text-blue-500 border border-blue-400 rounded px-1">external</span>{/if}
			{/snippet}
			{#snippet tree(nodes: NodeDef[])}
				<ul class="pl-4 border-l border-gray-200">
					{#each nodes as n}
						{@const kids = childrenOf(n.name)}
						<li class="py-0.5">
							{#if kids.length}
								<details open>
									<summary class="cursor-pointer">{@render nodeLabel(n)}</summary>
									{@render tree(kids)}
								</details>
							{:else}
								{@render nodeLabel(n)}
							{/if}
						</li>
					{/each}
				</ul>
			{/snippet}
			{@render tree(treeRoots)}
		</div>
	</div>
</div>

{#if selectedNode}
	<OrgUnitModal
		bind:unit={selectedNode}
		organizationOptions={data.organizationOptions}
	/>
{/if}
