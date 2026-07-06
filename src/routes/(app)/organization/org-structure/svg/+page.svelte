<script lang="ts">
import { setContext } from 'svelte';
import G    from './svg_g.svelte';
import Node from './svg_node.svelte';
import Line from './svg_path.svelte';
import { Draw, REGISTRY_CTX, type Registry, type NodeRef } from './registry';
import { buildLayout, type NodeDef } from './layout';
import { createPanZoom, type PanZoomInstance } from '$lib/utils/pan-zoom';

const _reg = new Map<string, NodeRef>();
const registry: Registry = {
    register:   (k, ref) => _reg.set(k, ref),
    unregister: (k)      => _reg.delete(k),
    get:        (k)      => _reg.get(k),
};
setContext(REGISTRY_CTX, registry);

const structure: NodeDef[] = [
    { name: 'SS', label: 'Secretary' },
    { name: 'A',  label: 'Anita',          group: 'SS' },
    { name: 'B',  label: 'Bella',          group: 'SS', parent: 'A', shadow: 'P' },
    { name: 'FF', label: 'Finance' },
    { name: 'C',  label: 'Crystal Claire', group: 'FF' },
    { name: 'D',  label: 'Debbie Kristoff',group: 'FF', parent: 'C' },
    { name: 'H',  label: 'Hatory',         group: 'FF', parent: 'D' },
    { name: 'I',  label: 'Iruma',         group: 'FF', parent: 'D' },
    { name: 'E',  label: 'Emma Amelie',    group: 'FF', parent: 'C' },
    { name: 'Y',  label: 'Reina',          neck: 'C' },
    { name: 'G',  label: 'Haruka',          neck: 'FF' },
    { name: 'P',  label: 'Payable',        below: 'SS' },
    { name: 'Z',  label: 'Kohaku',         group: 'P' },
    { name: 'F',  label: 'Yuna',         group: 'P',parent:'B'  },
    { name: 'X',  label: 'Maggie Maureen' },
    { name: 'R', label: 'Receiveable', parent:'FF' },
    { name: 'M', label: 'Monitor', parent:'E' },
];

const { groups, standalones, connections, keyMap } = buildLayout(structure);

// Tree view: resolve children from the flat structure (parent > group > below > neck)
const isGroupHeader = (name: string) => structure.some(m => m.group === name);
function childrenOf(name: string): NodeDef[] {
    return structure.filter(d =>
        d.parent === name ||
        (d.group === name && !d.parent) ||
        d.below === name ||
        d.neck === name
    );
}
const treeRoots = structure.filter(d => !d.parent && !d.group && !d.below && !d.neck);
const labelOf = (name?: string) => structure.find(d => d.name === name)?.label ?? name;
function section(id:string){
    document.querySelectorAll("#wrapper>div").forEach(d=>{d.classList.add('hidden')});
    document.getElementById(id)?.classList.remove('hidden')
}
let svg_grid=$derived({} as any);
let chartEl: HTMLDivElement;
let viewportEl: SVGGElement;
let panZoom: PanZoomInstance | undefined;
import { onMount } from 'svelte';
onMount(() => {
    svg_grid= Draw('chart-grid',{});
    panZoom = createPanZoom({
        container: chartEl,
        target: viewportEl as unknown as HTMLElement,
        ctrlWheelZoom: true,
    });
    console.log(connections);
    return () => panZoom?.destroy();
})
</script>
<ul class="chart-menu flex gap-2 mb-2">
    <li onclick={()=>section(`chart-grid`)} class="hover:text-emerald-600 cursor-pointer border px-2">Grids View</li>
    <li onclick={()=>section('tree')} class="hover:text-emerald-600 cursor-pointer border px-2">Tree View</li>
    <li onclick={()=>section('chart')} class="hover:text-emerald-600 cursor-pointer border px-2">Chart</li>
</ul>
<div id="wrapper">
    <div id="chart" class="relative overflow-hidden cursor-grab" bind:this={chartEl}>
        <div class="absolute top-2 right-2 z-10 flex gap-1">
            <button class="border px-2 bg-white hover:text-emerald-600" title="Zoom in" onclick={()=>panZoom?.zoomIn()}>+</button>
            <button class="border px-2 bg-white hover:text-emerald-600" title="Zoom out" onclick={()=>panZoom?.zoomOut()}>−</button>
            <button class="border px-2 bg-white hover:text-emerald-600" title="Reset" onclick={()=>panZoom?.reset()}>⟲</button>
        </div>
        <svg class="border w-full" style="min-height:87vh;">
            <g bind:this={viewportEl} style="transform-origin:0 0;">
            {#each groups as g}
                <G x={g.x} y={g.y} W={g.w} H={g.h} label={g.label} key={g.key}
                is_shadow={g.is_shadow} has_shadow={g.has_shadow} has_child={g.has_child} has_neck={g.has_neck}>
                    {#each g.nodes as node}
                        <Node x={node.lx} y={node.ly} absX={node.absX} absY={node.absY}
                            name={node.name} label={node.label} key={node.key}
                            has_parent={node.has_parent} has_child={node.has_child} has_shadow={node.has_shadow}
                            is_shadow={node.is_shadow} has_neck={node.has_neck} />
                    {/each}
                </G>
            {/each}

            {#each standalones as n}
                <Node x={n.x} y={n.y} absX={n.x} absY={n.y} name={n.name} label={n.label} key={n.key}
                    has_parent={n.has_parent} has_child={n.has_child} has_shadow={n.has_shadow} is_shadow={n.is_shadow} has_neck={n.has_neck} l_neck={n.l_neck} />
            {/each}

            {#each connections as c}
                <Line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} type={c.type} pathStyle={c.pathStyle} />
            {/each}
            </g>
        </svg>
    </div>
    <div id="chart-grid" class="border w-full h-[75vh] hidden p-1"> </div>
    <div id="tree" class="border w-full h-full hidden p-4">
        {#snippet nodeLabel(n: NodeDef)}
            <span class="font-medium">{isGroupHeader(n.name) ? '📁' : '📄'} {n.label}</span>
            <span class="text-xs text-gray-400">({n.name})</span>
            {#if n.shadow}<span class="text-xs text-green-600 border border-green-400 rounded px-1">shadow → {labelOf(n.shadow)}</span>{/if}
            {#if n.neck}<span class="text-xs text-orange-500 border border-orange-400 rounded px-1">neck</span>{/if}
            {#if n.below}<span class="text-xs text-gray-500 border border-gray-400 rounded px-1">below</span>{/if}
            {#if n.parent && !n.group}<span class="text-xs text-blue-500 border border-blue-400 rounded px-1">external</span>{/if}
        {/snippet}
        {#snippet tree(nodes: NodeDef[])}
            <ul class="pl-4 border-l border-gray-200">
                {#each nodes as n}
                    {@const kids = childrenOf(n.name)}
                    <li class="py-0.5">
                        {#if kids.length}
                            <details open>
                                <summary class="cursor-pointer hover:text-emerald-600">{@render nodeLabel(n)}</summary>
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
