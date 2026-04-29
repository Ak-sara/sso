<script lang="ts">
import { setContext } from 'svelte';
import G    from './svg_g.svelte';
import Node from './svg_node.svelte';
import Line from './svg_path.svelte';
import { REGISTRY_CTX, type Registry, type NodeRef } from './registry';
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
</script>

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
