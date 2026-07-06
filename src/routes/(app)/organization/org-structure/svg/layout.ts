import type { AnchorType } from './registry';

export type NodeDef    = { name: string; label: string; group?: string; parent?: string; shadow?: string; neck?: string; below?: string };
type        NameEntry  = { absX: number; absY: number; key: string; w: number; h: number };

export type LayoutNode = {
    name: string; label: string; key: string; lx: number; ly: number; absX: number; absY: number;
  has_parent?: boolean; has_child?: boolean; has_shadow?: boolean; is_shadow?: boolean; has_neck?: boolean; l_neck?: boolean;
};
export type LayoutGroup = {
    name: string; label: string; key: string; x: number; y: number; w: number; h: number; nodes: LayoutNode[];
    is_shadow?: boolean; has_shadow?: boolean; has_child?: boolean; has_neck?: boolean; l_neck?: boolean;
};
export type LayoutAlone = {
    name: string; label: string; key: string; x: number; y: number;
    has_parent?: boolean; has_child?: boolean; has_shadow?: boolean; is_shadow?: boolean; has_neck?: boolean; l_neck?: boolean;
};
export type Connection = {
    fromKey: string; toKey: string; x1: number; y1: number; x2: number; y2: number;
    type: 'blue' | 'green' | 'orange'; pathStyle: 'vhv' | 'hvh' | 'vh';
};

const NW = 160, NH = 60, H_GAP = 40, V_GAP = 40, G_PAD = 24, G_GAP = 60;
// first-vertical drop per line type. blue/green are applied by svg_path.svelte (vhv);
// orange is baked into neck node placement here — its 'vh' path just follows the node's y
export const DROP = { blue: 18, green: 14, orange: 10 } as const;

export function anchorPt(absX: number, absY: number, a: AnchorType, w = NW, h = NH): [number, number] {
    if (a === 'parent_in')  return [absX + w/2 - 8,  absY];
    if (a === 'parent_out') return [absX + w/2 - 8,  absY + h];
    if (a === 'shadow_in')  return [absX + w/2 + 8,  absY];
    if (a === 'shadow_out') return [absX + w/2 + 8,  absY + h];
    if (a === 'neck_out')   return [absX + w/2 + 12, absY + h];
    if (a === 'l_neck')     return [absX,             absY + h/2];
    if (a === 'r_neck')     return [absX + w,         absY + h/2];
    return [absX, absY];
}

function buildKey(groupName: string, memberName: string, members: NodeDef[]): string {
    const path: string[] = [];
    let cur: string | undefined = memberName;
    while (cur) { path.unshift(cur); cur = members.find(m => m.name === cur)?.parent; }
    return `${groupName}:${path.join('_')}`;
}

export function buildLayout(defs: NodeDef[]) {
    const isHeaderName = (name: string) => defs.some(m => m.group === name);
    const isHeader   = (n: NodeDef) => !n.neck && !n.group && !n.parent && isHeaderName(n.name);
    const isAlone    = (n: NodeDef) => !n.neck && !n.group && !n.parent && !isHeaderName(n.name);
    const isNeck     = (n: NodeDef) => !!n.neck && !n.group;
    const isExternal = (n: NodeDef) => !n.neck && !n.group && !!n.parent;

    const shadowSources = new Set(defs.filter(m => m.shadow).map(m => m.name));
    const shadowTargets = new Set(defs.filter(m => m.shadow).map(m => m.shadow!));
    const neckTargets   = new Set(defs.filter(m => m.neck).map(m => m.neck!));

    const groups:      LayoutGroup[]  = [];
    const standalones: LayoutAlone[]  = []; // alones + necks + externals unified
    const connections: Connection[]   = [];
    const keyMap  = new Map<string, LayoutNode | LayoutGroup | LayoutAlone>();
    const nameMap = new Map<string, NameEntry>();

    // external children grouped by the box they hang below (parent's group, or the parent itself)
    const boxOf = (pname: string) => defs.find(d => d.name === pname)?.group ?? pname;
    const rowsByBox = new Map<string, NodeDef[]>();
    for (const n of defs.filter(isExternal)) {
        const b = boxOf(n.parent!);
        if (!rowsByBox.has(b)) rowsByBox.set(b, []);
        rowsByBox.get(b)!.push(n);
    }
    // below-groups grouped by their reference box
    const belowsByRef = new Map<string, NodeDef[]>();
    for (const n of defs.filter(d => isHeader(d) && !!d.below)) {
        if (!belowsByRef.has(n.below!)) belowsByRef.set(n.below!, []);
        belowsByRef.get(n.below!)!.push(n);
    }

    function measureGroup(gh: NodeDef) {
        const members = defs.filter(n => n.group === gh.name);
        function subtreeW(name: string): number {
            const ch = members.filter(m => m.parent === name);
            if (!ch.length) return NW;
            return ch.reduce((s, c) => s + subtreeW(c.name), 0) + (ch.length - 1) * H_GAP;
        }
        const lpos: Record<string, { lx: number; ly: number }> = {};
        function place(name: string, startX: number, depth: number) {
            const ch = members.filter(m => m.parent === name);
            lpos[name] = { lx: startX + (subtreeW(name) - NW) / 2, ly: depth * (NH + V_GAP) };
            let cx = startX;
            for (const c of ch) { place(c.name, cx, depth + 1); cx += subtreeW(c.name) + H_GAP; }
        }
        const roots  = members.filter(m => !m.parent || !members.find(p => p.name === m.parent));
        const rootsW = roots.reduce((s, r) => s + subtreeW(r.name), 0) + (roots.length - 1) * H_GAP;
        let rx = (Math.max(NW, rootsW) - rootsW) / 2;
        for (const r of roots) { place(r.name, rx, 0); rx += subtreeW(r.name) + H_GAP; }
        const w = (members.length ? Math.max(...members.map(n => lpos[n.name].lx + NW)) : NW) + G_PAD * 2;
        const h = (members.length ? Math.max(...members.map(n => lpos[n.name].ly + NH)) : NH) + G_PAD * 2;
        return { members, lpos, w, h };
    }
    type Meas = ReturnType<typeof measureGroup>;

    // ---- column model: a top-level box plus everything stacked below it (external rows, below-groups),
    // measured before placement so the whole column reserves its width and neighbours cannot overlap
    type Block =
        | { kind: 'group'; def: NodeDef; meas: Meas; ox: number; oy: number; w: number }
        | { kind: 'row';   kids: NodeDef[];          ox: number; oy: number; w: number };

    function stackBox(def: NodeDef, ox: number, oy: number, blocks: Block[]): number {
        const meas = measureGroup(def);
        blocks.push({ kind: 'group', def, meas, ox, oy, w: meas.w });
        let bottom = oy + meas.h;
        const kids = rowsByBox.get(def.name) ?? [];
        if (kids.length) {
            const rw = kids.length * NW + (kids.length - 1) * H_GAP;
            blocks.push({ kind: 'row', kids, ox: ox + (meas.w - rw) / 2, oy: bottom + V_GAP, w: rw });
            bottom += V_GAP + NH;
        }
        for (const b of belowsByRef.get(def.name) ?? []) bottom = stackBox(b, ox, bottom + G_GAP, blocks);
        return bottom;
    }

    function realizeGroup(gh: NodeDef, meas: Meas, gAX: number, gAY: number) {
        const { members, lpos, w: gW, h: gH } = meas;
        const gKey = gh.name;
        const nodes: LayoutNode[] = members.map(n => {
            const lx = lpos[n.name].lx + G_PAD, ly = lpos[n.name].ly + G_PAD;
            return {
                name: n.name, label: n.label, key: buildKey(gKey, n.name, members), lx, ly,
                absX: gAX + lx, absY: gAY + ly,
                has_parent: !!n.parent && defs.some(d => d.name === n.parent),
                has_child:  defs.some(d => d.parent === n.name),
                has_shadow: shadowSources.has(n.name),
                is_shadow:  shadowTargets.has(n.name),
                has_neck:   neckTargets.has(n.name),
            };
        });
        const g: LayoutGroup = {
            name: gh.name, label: gh.label, key: gKey, x: gAX, y: gAY, w: gW, h: gH, nodes,
            is_shadow:  shadowTargets.has(gh.name),
            has_shadow: shadowSources.has(gh.name),
            has_child:  defs.some(d => d.parent === gh.name),
            has_neck:   neckTargets.has(gh.name),
        };
        groups.push(g);
        keyMap.set(gKey, g);
        nameMap.set(gh.name, { absX: gAX, absY: gAY, key: gKey, w: gW, h: gH });
        for (const n of nodes) {
            keyMap.set(n.key, n);
            nameMap.set(n.name, { absX: n.absX, absY: n.absY, key: n.key, w: NW, h: NH });
        }
        // blue connectors between members of the same group
        for (const m of members.filter(m => m.parent && members.find(p => p.name === m.parent))) {
            const pn = nodes.find(n => n.name === m.parent)!;
            const cn = nodes.find(n => n.name === m.name)!;
            const [x1, y1] = anchorPt(pn.absX, pn.absY, 'parent_out');
            const [x2, y2] = anchorPt(cn.absX, cn.absY, 'parent_in');
            connections.push({ fromKey: pn.key, toKey: cn.key, x1, y1, x2, y2, type: 'blue', pathStyle: 'vhv' });
        }
    }

    function placeStandalone(n: NodeDef, x: number, y: number, extra: Partial<LayoutAlone> = {}) {
        const s: LayoutAlone = {
            name: n.name, label: n.label, key: n.name, x, y,
            has_child:  defs.some(d => d.parent === n.name),
            has_shadow: shadowSources.has(n.name), is_shadow: shadowTargets.has(n.name),
            has_neck: neckTargets.has(n.name),
            ...extra,
        };
        standalones.push(s);
        keyMap.set(n.name, s);
        nameMap.set(n.name, { absX: x, absY: y, key: n.name, w: NW, h: NH });
    }

    // Pass 1 — top-level items in definition order (header columns, alones, necks),
    // so a neck defined right after its target group lands next to it
    let cursorX = G_PAD;
    const pendingNecks: NodeDef[] = [];
    function placeNeck(n: NodeDef) {
        const tgt = nameMap.get(n.neck!);
        if (!tgt) return;
        placeStandalone(n, cursorX, tgt.absY + tgt.h + DROP.orange - NH / 2, { l_neck: true });
        cursorX += NW + H_GAP;
    }
    for (const n of defs) {
        if (isHeader(n) && !n.below) {
            const blocks: Block[] = [];
            stackBox(n, 0, 0, blocks);
            const minOx = Math.min(...blocks.map(b => b.ox));
            const maxOx = Math.max(...blocks.map(b => b.ox + b.w));
            const baseX = cursorX - minOx, baseY = G_PAD;
            for (const b of blocks) {
                if (b.kind === 'group') realizeGroup(b.def, b.meas, baseX + b.ox, baseY + b.oy);
                else {
                    let x = baseX + b.ox;
                    for (const kid of b.kids) { placeStandalone(kid, x, baseY + b.oy, { has_parent: true }); x += NW + H_GAP; }
                }
            }
            cursorX += (maxOx - minOx) + G_GAP;
        }
        else if (isAlone(n)) { placeStandalone(n, cursorX, G_PAD); cursorX += NW + H_GAP; }
        else if (isNeck(n))  { if (nameMap.has(n.neck!)) placeNeck(n); else pendingNecks.push(n); }
    }
    for (const n of pendingNecks) placeNeck(n);

    // Pass 2 — blue connectors that cross box boundaries: external children + members whose parent is in another group
    for (const n of defs.filter(d => !!d.parent && (isExternal(d) || (!!d.group && !defs.some(m => m.group === d.group && m.name === d.parent))))) {
        const src = nameMap.get(n.parent!), me = nameMap.get(n.name);
        if (!src || !me) continue;
        const [x1, y1] = anchorPt(src.absX, src.absY, 'parent_out', src.w, src.h);
        const [x2, y2] = anchorPt(me.absX, me.absY, 'parent_in', me.w, me.h);
        connections.push({ fromKey: src.key, toKey: me.key, x1, y1, x2, y2, type: 'blue', pathStyle: 'vhv' });
    }

    // Pass 3 — shadow connections: shadow_out → shadow_in (green vhv)
    for (const n of defs.filter(m => !!m.shadow)) {
        const src = nameMap.get(n.name), tgt = nameMap.get(n.shadow!);
        if (!src || !tgt) continue;
        const [x1, y1] = anchorPt(src.absX, src.absY, 'shadow_out', src.w, src.h);
        const [x2, y2] = anchorPt(tgt.absX, tgt.absY, 'shadow_in',  tgt.w, tgt.h);
        connections.push({ fromKey: src.key, toKey: tgt.key, x1, y1, x2, y2, type: 'green', pathStyle: 'vhv' });
    }

    // Pass 4 — neck connections: neck_out → l_neck (orange vh)
    for (const n of defs.filter(isNeck)) {
        const src = nameMap.get(n.name), tgt = nameMap.get(n.neck!);
        if (!src || !tgt) continue;
        const [x1, y1] = anchorPt(tgt.absX, tgt.absY, 'neck_out', tgt.w, tgt.h);
        const [x2, y2] = anchorPt(src.absX, src.absY, 'l_neck',   src.w, src.h);
        connections.push({ fromKey: tgt.key, toKey: src.key, x1, y1, x2, y2, type: 'orange', pathStyle: 'vh' });
    }

    return { groups, standalones, connections, keyMap };
}
