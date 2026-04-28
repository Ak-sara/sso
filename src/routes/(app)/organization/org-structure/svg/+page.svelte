<script lang="ts">
import G    from './svg_g.svelte';
import Node from './svg_node.svelte';
import Line from './svg_path.svelte';

// ── Types ──────────────────────────────────────────────────────────────────
type NodeDef = { name: string; label: string; group?: string; parent?: string };

type LayoutNode    = { name: string; label: string; lx: number; ly: number };
type LayoutGroup   = { name: string; label: string; x: number; y: number; w: number; h: number; nodes: LayoutNode[] };
type LayoutAlone   = { name: string; label: string; x: number; y: number };
type Connection    = { x1: number; y1: number; x2: number; y2: number };

// ── Constants ──────────────────────────────────────────────────────────────
const NW = 160, NH = 60;   // node width / height
const H_GAP = 40;          // gap between siblings
const V_GAP = 40;          // gap between parent and children levels
const G_PAD = 24;          // padding inside group box
const G_GAP = 60;          // gap between groups

// ── Sample data ────────────────────────────────────────────────────────────
const structure: NodeDef[] = [
    { name: 'SS', label: 'Secretary' },
    { name: 'A',  label: 'Anita',          group: 'SS' },
    { name: 'B',  label: 'Bella',          group: 'SS', parent: 'A' },
    { name: 'FF', label: 'Finance' },
    { name: 'C',  label: 'Crystal Claire', group: 'FF' },
    { name: 'D',  label: 'Debbie Kristoff',group: 'FF', parent: 'C' },
    { name: 'E',  label: 'Emma Amelie',    group: 'FF', parent: 'C' },
    { name: 'X',  label: 'Maggie Maureen' },
];

// ── Layout algorithm ───────────────────────────────────────────────────────
function buildLayout(defs: NodeDef[]) {
    const isHeader   = (n: NodeDef) => !n.group && !n.parent && defs.some(m => m.group === n.name);
    const isAlone    = (n: NodeDef) => !n.group && !n.parent && !defs.some(m => m.group === n.name);

    const groups: LayoutGroup[]  = [];
    const alones: LayoutAlone[]  = [];
    const connections: Connection[] = [];
    let cursorX = G_PAD;

    for (const gh of defs.filter(isHeader)) {
        const members = defs.filter(n => n.group === gh.name);

        // Minimum width needed to display a subtree rooted at `name`
        function subtreeW(name: string): number {
            const children = members.filter(m => m.parent === name);
            if (!children.length) return NW;
            const total = children.reduce((s, c) => s + subtreeW(c.name), 0);
            return total + (children.length - 1) * H_GAP;
        }

        // DFS: place `name` centred over its children starting at local x=startX, depth=depth
        const lpos: Record<string, { lx: number; ly: number }> = {};
        function place(name: string, startX: number, depth: number) {
            const children = members.filter(m => m.parent === name);
            const sw = subtreeW(name);
            lpos[name] = { lx: startX + (sw - NW) / 2, ly: depth * (NH + V_GAP) };
            let cx = startX;
            for (const c of children) { place(c.name, cx, depth + 1); cx += subtreeW(c.name) + H_GAP; }
        }

        // roots = group members with no parent inside the group
        const roots = members.filter(m => !m.parent || !members.find(p => p.name === m.parent));

        // group header (SS/FF) sits at depth 0, group members start at depth 1
        const rootsW = roots.reduce((s, r) => s + subtreeW(r.name), 0) + (roots.length - 1) * H_GAP;
        const contentW = Math.max(NW, rootsW);
        lpos[gh.name] = { lx: (contentW - NW) / 2, ly: 0 };

        let rx = (contentW - rootsW) / 2;   // centre roots under header
        for (const r of roots) { place(r.name, rx, 1); rx += subtreeW(r.name) + H_GAP; }

        // bounding box of all local positions
        const all = [gh, ...members];
        const maxLX = Math.max(...all.map(n => lpos[n.name].lx + NW));
        const maxLY = Math.max(...all.map(n => lpos[n.name].ly + NH));
        const gW = maxLX + G_PAD * 2;
        const gH = maxLY + G_PAD * 2;
        const gAX = cursorX, gAY = G_PAD;

        // offset local positions by padding
        const nodes: LayoutNode[] = all.map(n => ({
            name:  n.name,
            label: n.label,
            lx:    lpos[n.name].lx + G_PAD,
            ly:    lpos[n.name].ly + G_PAD,
        }));

        groups.push({ name: gh.name, label: gh.label, x: gAX, y: gAY, w: gW, h: gH, nodes });

        // ── connections (absolute coords) ───
        // header → each root
        const ghNode = nodes.find(n => n.name === gh.name)!;
        for (const r of roots) {
            const rn = nodes.find(n => n.name === r.name)!;
            connections.push({ x1: gAX + ghNode.lx + NW/2, y1: gAY + ghNode.ly + NH,
                               x2: gAX + rn.lx + NW/2,    y2: gAY + rn.ly });
        }
        // parent → child within group
        for (const m of members) {
            if (m.parent && members.find(p => p.name === m.parent)) {
                const pn = nodes.find(n => n.name === m.parent)!;
                const cn = nodes.find(n => n.name === m.name)!;
                connections.push({ x1: gAX + pn.lx + NW/2, y1: gAY + pn.ly + NH,
                                   x2: gAX + cn.lx + NW/2, y2: gAY + cn.ly });
            }
        }

        cursorX += gW + G_GAP;
    }

    for (const n of defs.filter(isAlone)) {
        alones.push({ name: n.name, label: n.label, x: cursorX, y: G_PAD });
        cursorX += NW + H_GAP;
    }

    return { groups, alones, connections };
}

const { groups, alones, connections } = buildLayout(structure);
console.log(groups, alones, connections)
</script>

<svg class="border w-full" style="min-height:87vh;">
    <!-- lines first so they appear behind nodes -->
    {#each connections as c}
        <Line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} />
    {/each}

    <!-- grouped nodes — G sets coordinate origin via transform -->
    {#each groups as g}
        <G x={g.x} y={g.y} w={g.w} h={g.h} label={g.label}>
            {#each g.nodes as node}
                <Node x={node.lx} y={node.ly} name={node.name} label={node.label} />
            {/each}
        </G>
    {/each}

    <!-- standalone nodes use absolute coords directly -->
    {#each alones as n}
        <Node x={n.x} y={n.y} name={n.name} label={n.label} />
    {/each}
</svg>
