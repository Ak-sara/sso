import type { AnchorType } from './registry';

export type NodeDef    = { name: string; label: string; group?: string; parent?: string; shadow?: string; neck?: string; below?: string };
type        NameEntry  = { absX: number; absY: number; key: string; w: number; h: number };

export type LayoutNode = {
    name: string; label: string; key: string; lx: number; ly: number; absX: number; absY: number;
    has_parent?: boolean; has_shadow?: boolean; is_shadow?: boolean; has_neck?: boolean; l_neck?: boolean;
};
export type LayoutGroup = {
    name: string; label: string; key: string; x: number; y: number; w: number; h: number; nodes: LayoutNode[];
    is_shadow?: boolean; has_shadow?: boolean; has_neck?: boolean; l_neck?: boolean;
};
export type LayoutAlone = {
    name: string; label: string; key: string; x: number; y: number;
    has_shadow?: boolean; is_shadow?: boolean; has_neck?: boolean; l_neck?: boolean;
};
export type Connection = {
    fromKey: string; toKey: string; x1: number; y1: number; x2: number; y2: number;
    type: 'blue' | 'green' | 'orange'; pathStyle: 'vhv' | 'hvh' | 'vh';
};

const NW = 160, NH = 60, H_GAP = 40, V_GAP = 40, G_PAD = 24, G_GAP = 60;

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
    const isHeader = (n: NodeDef) => !n.neck && !n.group && !n.parent && defs.some(m => m.group === n.name);
    const isAlone  = (n: NodeDef) => !n.neck && !n.group && !n.parent && !defs.some(m => m.group === n.name);
    const isNeck   = (n: NodeDef) => !!n.neck && !n.group;

    const shadowSources = new Set(defs.filter(m => m.shadow).map(m => m.name));
    const shadowTargets = new Set(defs.filter(m => m.shadow).map(m => m.shadow!));
    const neckTargets   = new Set(defs.filter(m => m.neck).map(m => m.neck!));

    const groups:      LayoutGroup[]  = [];
    const standalones: LayoutAlone[]  = []; // alones + necks unified
    const connections: Connection[]   = [];
    const keyMap  = new Map<string, LayoutNode | LayoutGroup | LayoutAlone>();
    const nameMap = new Map<string, NameEntry>();
    let cursorX = G_PAD;

    // Pass 1 — groups (non-below first so reference exists when below-group is processed)
    for (const gh of defs.filter(isHeader).sort((a, b) => (a.below ? 1 : 0) - (b.below ? 1 : 0))) {
        const members = defs.filter(n => n.group === gh.name);
        const gKey    = gh.name;

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

        const roots   = members.filter(m => !m.parent || !members.find(p => p.name === m.parent));
        const rootsW  = roots.reduce((s, r) => s + subtreeW(r.name), 0) + (roots.length - 1) * H_GAP;
        let rx = (Math.max(NW, rootsW) - rootsW) / 2;
        for (const r of roots) { place(r.name, rx, 0); rx += subtreeW(r.name) + H_GAP; }

        const gW = (members.length ? Math.max(...members.map(n => lpos[n.name].lx + NW)) : NW) + G_PAD * 2;
        const gH = (members.length ? Math.max(...members.map(n => lpos[n.name].ly + NH)) : NH) + G_PAD * 2;
        const ref  = gh.below ? nameMap.get(gh.below) : undefined;
        const gAX  = ref ? ref.absX : cursorX;
        const gAY  = ref ? ref.absY + ref.h + G_GAP : G_PAD;

        const nodes: LayoutNode[] = members.map(n => {
            const lx = lpos[n.name].lx + G_PAD, ly = lpos[n.name].ly + G_PAD;
            return {
                name: n.name, label: n.label, key: buildKey(gKey, n.name, members), lx, ly,
                absX: gAX + lx, absY: gAY + ly,
                has_parent: !!(n.parent && members.find(p => p.name === n.parent)),
                has_shadow: shadowSources.has(n.name),
                is_shadow:  shadowTargets.has(n.name),
                has_neck:   neckTargets.has(n.name),
            };
        });

        const g: LayoutGroup = {
            name: gh.name, label: gh.label, key: gKey, x: gAX, y: gAY, w: gW, h: gH, nodes,
            is_shadow:  shadowTargets.has(gh.name),
            has_shadow: shadowSources.has(gh.name),
            has_neck:   neckTargets.has(gh.name),
        };
        groups.push(g);
        keyMap.set(gKey, g);
        nameMap.set(gh.name, { absX: gAX, absY: gAY, key: gKey, w: gW, h: gH });
        for (const n of nodes) {
            keyMap.set(n.key, n);
            nameMap.set(n.name, { absX: n.absX, absY: n.absY, key: n.key, w: NW, h: NH });
        }

        for (const m of members.filter(m => m.parent && members.find(p => p.name === m.parent))) {
            const pn = nodes.find(n => n.name === m.parent)!;
            const cn = nodes.find(n => n.name === m.name)!;
            const [x1, y1] = anchorPt(pn.absX, pn.absY, 'parent_out');
            const [x2, y2] = anchorPt(cn.absX, cn.absY, 'parent_in');
            connections.push({ fromKey: pn.key, toKey: cn.key, x1, y1, x2, y2, type: 'blue', pathStyle: 'vhv' });
        }

        if (!gh.below) cursorX += gW + G_GAP;
    }

    // Pass 2 — standalones (alones)
    for (const n of defs.filter(isAlone)) {
        const s: LayoutAlone = {
            name: n.name, label: n.label, key: n.name, x: cursorX, y: G_PAD,
            has_shadow: shadowSources.has(n.name), is_shadow: shadowTargets.has(n.name), has_neck: neckTargets.has(n.name),
        };
        standalones.push(s);
        keyMap.set(n.name, s);
        nameMap.set(n.name, { absX: s.x, absY: s.y, key: s.key, w: NW, h: NH });
        cursorX += NW + H_GAP;
    }

    // Pass 3 — neck nodes (0.5 level below their target, appended to standalones)
    for (const n of defs.filter(isNeck)) {
        const tgt = nameMap.get(n.neck!);
        if (!tgt) continue;
        const s: LayoutAlone = { name: n.name, label: n.label, key: n.name, x: cursorX, y: tgt.absY + (NH + V_GAP) / 2, l_neck: true };
        standalones.push(s);
        keyMap.set(n.name, s);
        nameMap.set(n.name, { absX: s.x, absY: s.y, key: s.key, w: NW, h: NH });
        cursorX += NW + H_GAP;
    }

    // Pass 4 — shadow connections: shadow_out → shadow_in (green vhv)
    for (const n of defs.filter(m => !!m.shadow)) {
        const src = nameMap.get(n.name), tgt = nameMap.get(n.shadow!);
        if (!src || !tgt) continue;
        const [x1, y1] = anchorPt(src.absX, src.absY, 'shadow_out', src.w, src.h);
        const [x2, y2] = anchorPt(tgt.absX, tgt.absY, 'shadow_in',  tgt.w, tgt.h);
        connections.push({ fromKey: src.key, toKey: tgt.key, x1, y1, x2, y2, type: 'green', pathStyle: 'vhv' });
    }

    // Pass 5 — neck connections: neck_out → l_neck (orange vh)
    for (const n of defs.filter(isNeck)) {
        const src = nameMap.get(n.name), tgt = nameMap.get(n.neck!);
        if (!src || !tgt) continue;
        const [x1, y1] = anchorPt(tgt.absX, tgt.absY, 'neck_out', tgt.w, tgt.h);
        const [x2, y2] = anchorPt(src.absX, src.absY, 'l_neck',   src.w, src.h);
        connections.push({ fromKey: tgt.key, toKey: src.key, x1, y1, x2, y2, type: 'orange', pathStyle: 'vh' });
    }

    return { groups, standalones, connections, keyMap };
}
