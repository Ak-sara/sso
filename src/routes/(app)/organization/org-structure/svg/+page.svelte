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

let structure: NodeDef[] = [
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
let structure2: NodeDef[] =[
    {name:'DU',label:'Direktur Utama', group:"DD"},
    {name:'DH',label:'Direktur SDM', group:"DD",parent:'DU'},
    {name:'DK',label:'Direktur Keuangan', group:"DD",parent:'DU'},
    {name:'DO',label:'Direktur Operasi', group:"DD",parent:'DU'},
    {name:'DR',label:'Direktur Resiko', group:"DD",parent:'DU'},
    {name:'DC',label:'Direktur Komersial', group:"DD",parent:'DU'},
    
    {name:"DD",label:"Directorate"},
    {name:"D_U",label:"Core Directorate", neck:'DU'},
    {name:"D_H",label:"Man Power Directorate", parent:'DH'},
    {name:"D_K",label:"Finance Directorate", parent:'DK'},
    {name:"D_O",label:"Operation Directorate", parent:'DO'},
    {name:"D_R",label:"Risk Directorate", parent:'DR'},
    {name:"D_C",label:"Commercial Directorate", parent:'DC'},
        
    {name:'IA',label:'Internal Audit', group:"D_U"},
    {name:'CS',label:'Corporate Secretary', group:"D_U"},
    {name:'BPS',label:'Business Performance and Strategy', group:"D_U"},
    {name:'CST',label:'Corporate Strategy', group:"D_U"},

    {name:'HB',label:'HC BP and Talent', group:"D_H"},
    {name:'HS',label:'HC Strategy and Planning',group:'D_H'},
    {name:'IT',label:'Information Technology', group:"D_H"},
    {name:'HG',label:'HC Service and GA', group:"D_H"},
    {name:'CF',label:'Corporate Finance',group:'D_K'},
    {name:'ACC',label:'Accounting', group:"D_K"},
    {name:'PC',label:'Procurement', group:"D_R"},
    {name:'LG',label:'Legal', group:"D_R"},
    {name:'RM',label:'Risk Management Governance and Compliance', group:"D_R"},
    {name:'OPS',label:'Operation Excellence & Standarization', group:"D_O"},
    {name:'CX',label:'Customer Experience', group:"D_O"},
    {name:'BP',label:'Business Portfolio', group:"D_O"},
    {name:'CD',label:'Commercial Development', group:"D_C"},
    {name:'SSM',label:'Strategic Sales Marketing', group:"D_C"},
    {name:'SPM',label:'Strategic Performance Management', group:"D_C"},
    
    {name:'CL',label:'Contract Logistics',parent:'LOG'},
    {name:'SAF',label:'Accounting & Finance',parent:'CLS'},
    {name:'KS',label:'Key Account and Solutions',parent:'CBE'},
    
    {name:'CGSL',label:'Sales',parent:'SCS'},
    {name:'SBUCL',label:'SBU Cargo & Logistics',below:"DC",parent:"DD"},
    {name:'FF',label:'Freight Forwarder',parent:'LOG'},
    {name:'SHL',label:'HC and Legal',parent:'CLS'},
    {name:'LOG',label:'Logistics',parent:'SBUCL'},
    {name:'RA',label:'Regulated Agent',parent:'SCS'},
    {name:'SFS',label:'Facility and System',parent:'CLS'},

    {name:'CLS',label:'Cargo & Logistics Supports',parent:'SBUCL'},
    {name:'PQ',label:'Policy and QHSE',parent:'CBE'},
    {name:'GMCO',label:'Cargo Operation',parent:'SCS'},
    
    {name:'CI',label:'Cargo Improvement',parent:'SCS'},
    {name:'BSS',label:'Baggage Service Solutions',parent:'LOG'},
    {name:'PO',label:'Procurement Outbound',parent:'CBE'},
    {name:'SCS',label:'Cargo Service',parent:'SBUCL'},
    {name:'CBE',label:'Commercial & Business Excellence',parent:'SBUCL'},
    {name:'AE',label:'Air Express',parent:'LOG'},
    {name:'BIP',label:'Business Intelligence and Performance',parent:'CBE'},

    {name:"BO",label:"Branches", below:'DD'},
    {name:'KNO',label:'Regional Station KNO',group:"BO",parent:'GMCO'},
    {name:'DPS',label:'Regional Station DPS',group:"BO",parent:'GMCO'},
    {name:'UPG',label:'Regional Station UPG',group:"BO",parent:'GMCO'},
    {name:'CGK',label:'Regional Station CGK',group:"BO",parent:'GMCO'},

    {name:'SAS',label:'SDU: Aviation Service'},
    {name:'SFM',label:'SDU: Facility Management & Manpower Service'},
    {name:'SHO',label:'SDU: Hospitality'},
    {name:'SACA',label:'SDU: IAS Academy'},
    {name:'SERP',label:'SDU: ERP'},
    {name:'SAM',label:'SDU: Assets Management'},    
];

const { groups: groups0, standalones: standalones0, connections: connections0, keyMap: keyMap0 } = buildLayout(structure);
const { groups, standalones, connections, keyMap } = buildLayout(structure2);

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
    
    return () => panZoom?.destroy();
})
</script>
<ul class="chart-menu flex gap-2 mb-2">
    <li onclick={()=>section(`chart-grid`)} class="hover:text-emerald-600 cursor-pointer border px-2">Grids View</li>
    <li onclick={()=>section('tree')} class="hover:text-emerald-600 cursor-pointer border px-2">Tree View</li>
    <li onclick={()=>section('chart')} class="hover:text-emerald-600 cursor-pointer border px-2">Chart</li>
    <li onclick={()=>section('chart2')} class="hover:text-emerald-600 cursor-pointer border px-2">Chart2</li>
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
    <div id="chart2" class="relative overflow-hidden hidden cursor-grab">
        <svg class="border w-full" style="min-height:87vh;">
            <g style="transform-origin:0 0;">
            {#each groups0 as g}
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

            {#each standalones0 as n}
                <Node x={n.x} y={n.y} absX={n.x} absY={n.y} name={n.name} label={n.label} key={n.key}
                    has_parent={n.has_parent} has_child={n.has_child} has_shadow={n.has_shadow} is_shadow={n.is_shadow} has_neck={n.has_neck} l_neck={n.l_neck} />
            {/each}

            {#each connections0 as c}
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
