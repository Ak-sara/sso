<script lang="ts">
import { setContext } from 'svelte';
import G    from './svg_g.svelte';
import Node from './svg_node.svelte';
import Line from './svg_path.svelte';
import { Draw, REGISTRY_CTX, type Registry, type NodeRef } from './registry';
import { buildLayout, type NodeDef } from './layout';

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
    { name: 'E',  label: 'Emma Amelie',    group: 'FF', parent: 'C' },
    { name: 'X',  label: 'Maggie Maureen' },
    { name: 'Y',  label: 'Reina',          neck: 'C' },
    { name: 'P',  label: 'Payable',        below: 'SS' },
    { name: 'Z',  label: 'Kohaku',         group: 'P' },
];

const { groups, standalones, connections, keyMap } = buildLayout(structure);
function section(id:string){
    document.querySelectorAll("#wrapper>div").forEach(d=>{d.classList.add('hidden')});
    document.getElementById(id)?.classList.remove('hidden')
}
let svg_grid=$derived({} as any);
import { onMount } from 'svelte';
onMount(() => {
    svg_grid= Draw('chart-grid',{});
})
</script>
<ul class="chart-menu flex gap-2 mb-2">
    <li onclick={()=>section(`chart-grid`)} class="hover:text-emerald-600 cursor-pointer border px-2">Grids View</li>
    <li onclick={()=>section('tree')} class="hover:text-emerald-600 cursor-pointer border px-2">Tree View</li>
    <li onclick={()=>section('chart')} class="hover:text-emerald-600 cursor-pointer border px-2">Chart</li>
</ul>
<div id="wrapper">
    <div id="chart">
        <svg class="border w-full" style="min-height:87vh;">
            {#each groups as g}
                <G x={g.x} y={g.y} W={g.w} H={g.h} label={g.label} key={g.key}
                is_shadow={g.is_shadow} has_shadow={g.has_shadow} has_neck={g.has_neck}>
                    {#each g.nodes as node}
                        <Node x={node.lx} y={node.ly} absX={node.absX} absY={node.absY}
                            name={node.name} label={node.label} key={node.key}
                            has_parent={node.has_parent} has_shadow={node.has_shadow}
                            is_shadow={node.is_shadow} has_neck={node.has_neck} />
                    {/each}
                </G>
            {/each}

            {#each standalones as n}
                <Node x={n.x} y={n.y} absX={n.x} absY={n.y} name={n.name} label={n.label} key={n.key}
                    has_shadow={n.has_shadow} is_shadow={n.is_shadow} has_neck={n.has_neck} l_neck={n.l_neck} />
            {/each}

            {#each connections as c}
                <Line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} type={c.type} pathStyle={c.pathStyle} />
            {/each}
        </svg>
    </div>
    <div id="chart-grid" class="border w-full h-[75vh] hidden p-1"> </div>
    <div id="tree" class="border w-full h-full hidden">
        <div class="flex w-90 h-20 mb-2">
            <svg width="100%" height="100%" viewbox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" xml:space="preserve">
                <path fill="none" stroke="#F39" stroke-width="5" d="m0,0 v 1000 h 1000 v -1000 h -1000" />
                <path fill="none" stroke="#3A3" stroke-width="5" d="M200,950 v-300 h500 v-300" />
            </svg>
            <svg width="100%" height="100%" viewbox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" xml:space="preserve">
                <path fill="none" stroke="#F39" stroke-width="5" d="m0,0 v 1000 h 1000 v -1000 h -1000" />
                <path fill="none" stroke="#3A3" stroke-width="5" d="M800,950 v-300 h-500 v-300" />
            </svg>
            <svg width="100%" height="100%" viewbox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" xml:space="preserve">
                <path fill="none" stroke="#F39" stroke-width="5" d="m0,0 v 1000 h 1000 v -1000 h -1000" />
                <path fill="none" stroke="#3A3" stroke-width="5" d="M950,800 h-300 v-500 h-600" />
            </svg>
            <svg width="100%" height="100%" viewbox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" xml:space="preserve">
                <path fill="none" stroke="#F39" stroke-width="5" d="m0,0 v 1000 h 1000 v -1000 h -1000" />
                <path fill="none" stroke="#3A3" stroke-width="5" d="M50,800 h300 v-500 h600" />
            </svg>
        </div>

    </div>
</div>
