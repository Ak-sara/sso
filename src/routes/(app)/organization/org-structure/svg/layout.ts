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
export const DROP = { blue: 22, green: 18, orange: 16 } as const;

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

// ─────────────────────────────────────────────────────────────────────────────
// buildLayout — three-pass recursive layout
//
//  Pass 1  Build Col tree from flat defs (members + external children)
//  Pass 2  Bottom-up: compute slotW / boxW / boxH for every Col
//  Pass 3  Top-down:  assign absolute coordinates
//  Emit    Walk the tree to produce LayoutGroup / LayoutAlone / Connection
// ─────────────────────────────────────────────────────────────────────────────
export function buildLayout(defs: NodeDef[]) {
    const shadowSources = new Set(defs.filter(m => m.shadow).map(m => m.name));
    const shadowTargets = new Set(defs.filter(m => m.shadow).map(m => m.shadow!));
    const neckTargets   = new Set(defs.filter(m => m.neck).map(m => m.neck!));

    const outGroups:      LayoutGroup[] = [];
    const outStandalones: LayoutAlone[] = [];
    const outConnections: Connection[]  = [];
    const nameMap = new Map<string, NameEntry>();
    const keyMap  = new Map<string, LayoutNode | LayoutGroup | LayoutAlone>();

    // ── Pass 1: Build Col tree ────────────────────────────────────────────────

    // lpos entry: node position inside its parent group box
    type LPos = { lx: number; ly: number; slotLeft: number; slotW: number };
    // inner layout result for a group box
    type IL   = { boxW: number; boxH: number; lpos: Map<string, LPos> };

    type Col = {
        def: NodeDef;
        isBox: boolean;       // true when other defs declare group === def.name
        members: Col[];       // nodes physically inside this group box
        children: Col[];      // external cols hanging below (via parent / below)
        // computed in pass 2:
        slotW: number;        // total column width (covers box + recursive children)
        boxW:  number;        // own box width
        boxH:  number;        // own box height (group rect or NH)
        innerH: number;       // boxH extended to include member external-child subtrees
        totalH: number;       // innerH + direct children below
        // set in pass 3:
        absX: number;         // absolute left edge of this col's slot
        absY: number;         // absolute top of this col's box
        il?: IL;              // cached inner layout (group boxes only)
    };

    const colMap = new Map<string, Col>();
    for (const def of defs) {
        colMap.set(def.name, {
            def, isBox: defs.some(d => d.group === def.name),
            members: [], children: [],
            slotW: 0, boxW: 0, boxH: 0, innerH: 0, totalH: 0, absX: 0, absY: 0,
        });
    }

    // Wire members and external children
    for (const def of defs) {
        // member of a group box
        if (def.group) colMap.get(def.group)?.members.push(colMap.get(def.name)!);
        // pure external child (no group → pure parent link)
        if (def.parent && !def.group) colMap.get(def.parent)?.children.push(colMap.get(def.name)!);
        // `below` acts like a parent for placement (no group, no existing parent handled)
        if (def.below && !def.parent && !def.group) colMap.get(def.below)?.children.push(colMap.get(def.name)!);
    }

    // ── Pass 2: Bottom-up slot widths ─────────────────────────────────────────

    const sumW = (cols: Col[], gap: number) =>
        cols.length ? cols.reduce((s, c) => s + c.slotW, 0) + (cols.length - 1) * gap : 0;

    // Build internal layout for a group box.
    // Each member's slot width = max(NW, its external children's total width).
    // Internal parent-child ordering determines row structure.
    function buildIL(col: Col): IL {
        if (col.il) return col.il;
        const mems = col.members;
        if (!mems.length) {
            col.il = { boxW: NW + G_PAD * 2, boxH: NH + G_PAD * 2, lpos: new Map() };
            return col.il;
        }
        const memSet = new Set(mems.map(m => m.def.name));
        const roots  = mems.filter(m => !m.def.parent || !memSet.has(m.def.parent));

        // Slot width for a member inside the group, accounting for its external children
        function mSlotW(m: Col): number {
            const extW = sumW(m.children, G_GAP);
            const ownW = Math.max(NW, extW || NW);
            const inCh = mems.filter(c => c.def.parent === m.def.name);
            if (!inCh.length) return ownW;
            const inW  = inCh.reduce((s, c) => s + mSlotW(c), 0) + (inCh.length - 1) * H_GAP;
            return Math.max(ownW, inW);
        }

        const lpos = new Map<string, LPos>();
        function placeM(m: Col, startX: number, depth: number) {
            const sw  = mSlotW(m);
            lpos.set(m.def.name, { lx: startX + (sw - NW) / 2, ly: depth * (NH + V_GAP), slotLeft: startX, slotW: sw });
            const inCh = mems.filter(c => c.def.parent === m.def.name);
            let cx = startX;
            for (const c of inCh) { placeM(c, cx, depth + 1); cx += mSlotW(c) + H_GAP; }
        }

        const rW = roots.reduce((s, r) => s + mSlotW(r), 0) + (roots.length - 1) * H_GAP;
        let rx = (Math.max(NW, rW) - rW) / 2;
        for (const r of roots) { placeM(r, rx, 0); rx += mSlotW(r) + H_GAP; }

        const maxLx = Math.max(...mems.map(m => lpos.get(m.def.name)!.lx + NW));
        const maxLy = Math.max(...mems.map(m => lpos.get(m.def.name)!.ly + NH));
        col.il = { boxW: maxLx + G_PAD * 2, boxH: maxLy + G_PAD * 2, lpos };
        return col.il;
    }

    const computed = new Set<string>();
    function computeCol(col: Col) {
        if (computed.has(col.def.name)) return;
        computed.add(col.def.name);
        // Recurse members first (they own their children's slotW too)
        for (const m of col.members) computeCol(m);
        for (const c of col.children) computeCol(c);

        if (col.isBox || col.members.length) {
            const il = buildIL(col);
            col.boxW = il.boxW;
            col.boxH = il.boxH;
            // innerH: max vertical extent considering member external-child subtrees
            let maxInner = col.boxH;
            for (const m of col.members) {
                const lp = il.lpos.get(m.def.name);
                if (lp) {
                    // member top is at G_PAD + lp.ly inside the box; its full subtree is m.totalH
                    maxInner = Math.max(maxInner, G_PAD + lp.ly + m.totalH);
                }
            }
            col.innerH = maxInner;
        } else {
            col.boxW   = NW;
            col.boxH   = NH;
            col.innerH = NH;
        }
        // totalH = innerH + direct external children stacked below
        col.totalH = col.children.length
            ? col.innerH + G_GAP + Math.max(...col.children.map(c => c.totalH))
            : col.innerH;

        const extW = sumW(col.children, G_GAP);
        col.slotW  = Math.max(col.boxW, extW || col.boxW);
    }

    // ── Pass 3: Top-down coordinate assignment ────────────────────────────────

    function assignCoords(col: Col, slotLeft: number, y: number) {
        col.absX = slotLeft;
        col.absY = y;

        // Place direct external children below this box AND below any member subtrees
        if (col.children.length) {
            const chY      = y + col.innerH + G_GAP;
            const chTotalW = sumW(col.children, G_GAP);
            const chStartX = slotLeft + (col.slotW - chTotalW) / 2;
            let cx = chStartX;
            for (const ch of col.children) { assignCoords(ch, cx, chY); cx += ch.slotW + G_GAP; }
        }

        // For group boxes: assign member coords and recurse into member children
        if ((col.isBox || col.members.length) && col.members.length) {
            const il  = buildIL(col);
            const gAX = slotLeft + (col.slotW - col.boxW) / 2;
            const gAY = y;
            for (const m of col.members) {
                const lp = il.lpos.get(m.def.name)!;
                m.absX = gAX + lp.lx + G_PAD;
                m.absY = gAY + lp.ly + G_PAD;
                // Place this member's external children below the member node
                if (m.children.length) {
                    const mSlotLeft = gAX + lp.slotLeft + G_PAD;
                    const mChTotalW = sumW(m.children, G_GAP);
                    const mChStartX = mSlotLeft + (lp.slotW - mChTotalW) / 2;
                    let cx = mChStartX;
                    const mChY = m.absY + NH + G_GAP;
                    for (const ch of m.children) { assignCoords(ch, cx, mChY); cx += ch.slotW + G_GAP; }
                }
            }
        }
    }

    // ── Emit: walk tree → produce layout output ───────────────────────────────

    function emitGroup(col: Col) {
        const il   = buildIL(col);
        const gAX  = col.absX + (col.slotW - col.boxW) / 2;
        const gAY  = col.absY;
        const gKey = col.def.name;

        const nodes: LayoutNode[] = col.members.map(m => {
            const lp = il.lpos.get(m.def.name)!;
            const lx = lp.lx + G_PAD, ly = lp.ly + G_PAD;
            return {
                name: m.def.name, label: m.def.label,
                key: buildKey(gKey, m.def.name, col.members.map(mm => mm.def)),
                lx, ly, absX: gAX + lx, absY: gAY + ly,
                has_parent: !!m.def.parent && defs.some(d => d.name === m.def.parent),
                has_child:  m.children.length > 0 || defs.some(d => d.parent === m.def.name && !d.group),
                has_shadow: shadowSources.has(m.def.name),
                is_shadow:  shadowTargets.has(m.def.name),
                has_neck:   neckTargets.has(m.def.name),
            };
        });

        const g: LayoutGroup = {
            name: col.def.name, label: col.def.label, key: gKey,
            x: gAX, y: gAY, w: col.boxW, h: col.boxH, nodes,
            is_shadow:  shadowTargets.has(col.def.name),
            has_shadow: shadowSources.has(col.def.name),
            has_child:  col.children.length > 0,
            has_neck:   neckTargets.has(col.def.name),
            l_neck:     !!col.def.neck,
        };
        outGroups.push(g);
        keyMap.set(gKey, g);
        nameMap.set(col.def.name, { absX: gAX, absY: gAY, key: gKey, w: col.boxW, h: col.boxH });
        for (const n of nodes) {
            keyMap.set(n.key, n);
            nameMap.set(n.name, { absX: n.absX, absY: n.absY, key: n.key, w: NW, h: NH });
        }

        // Internal blue connectors (within same group)
        const memSet = new Set(col.members.map(m => m.def.name));
        for (const m of col.members) {
            if (m.def.parent && memSet.has(m.def.parent)) {
                const pn = nodes.find(n => n.name === m.def.parent)!;
                const cn = nodes.find(n => n.name === m.def.name)!;
                if (pn && cn) {
                    const [x1,y1] = anchorPt(pn.absX, pn.absY, 'parent_out');
                    const [x2,y2] = anchorPt(cn.absX, cn.absY, 'parent_in');
                    outConnections.push({ fromKey: pn.key, toKey: cn.key, x1, y1, x2, y2, type: 'blue', pathStyle: 'vhv' });
                }
            }
        }

        for (const ch of col.children) emitCol(ch);
        for (const m of col.members) for (const mch of m.children) emitCol(mch);
    }

    function emitNode(col: Col) {
        const x = col.absX + (col.slotW - NW) / 2;
        const y = col.absY;
        const s: LayoutAlone = {
            name: col.def.name, label: col.def.label, key: col.def.name, x, y,
            has_parent: !!col.def.parent || !!col.def.below,
            has_child:  col.children.length > 0,
            has_shadow: shadowSources.has(col.def.name),
            is_shadow:  shadowTargets.has(col.def.name),
            has_neck:   neckTargets.has(col.def.name),
        };
        outStandalones.push(s);
        keyMap.set(col.def.name, s);
        nameMap.set(col.def.name, { absX: x, absY: y, key: col.def.name, w: NW, h: NH });
        for (const ch of col.children) emitCol(ch);
    }

    function emitCol(col: Col) {
        if (col.isBox || col.members.length) emitGroup(col);
        else emitNode(col);
    }

    // ── Top-level roots + neck deferred placement ─────────────────────────────

    const allMemberNames = new Set(defs.filter(d => d.group).map(d => d.name));
    const allChildNames  = new Set([
        ...defs.filter(d => d.parent && !d.group).map(d => d.name),
        ...defs.filter(d => d.below && !d.parent && !d.group).map(d => d.name),
    ]);

    // neck nodes/groups are deferred until after main layout (need target in nameMap)
    const neckCols   = [...colMap.values()].filter(c => !!c.def.neck);
    const topLevel   = [...colMap.values()].filter(c =>
        !allMemberNames.has(c.def.name) &&
        !allChildNames.has(c.def.name) &&
        !c.def.neck
    );

    let cursorX = G_PAD;
    for (const col of topLevel) {
        computeCol(col);
        assignCoords(col, cursorX, G_PAD);
        emitCol(col);
        cursorX += col.slotW + G_GAP;
    }

    // Neck cols: place to the right of cursor, aligned to target's y
    for (const col of neckCols) {
        computeCol(col);
        const tgt = nameMap.get(col.def.neck!);
        if (tgt) {
            assignCoords(col, cursorX, tgt.absY);
            emitCol(col);
            cursorX += col.slotW + G_GAP;
        }
    }

    // ── Connections (cross-box blue, shadow green, neck orange) ───────────────

    // Cross-box blue: any parent link not already drawn as internal
    for (const def of defs) {
        if (!def.parent) continue;
        const src = nameMap.get(def.parent), me = nameMap.get(def.name);
        if (!src || !me) continue;
        // Skip if both are in same group (drawn internally in emitGroup)
        const parentGroup = defs.find(d => d.name === def.parent)?.group;
        if (def.group && def.group === parentGroup) continue;
        // Skip internal member-to-member same-group links
        if (def.group && defs.find(d => d.name === def.parent)?.group === def.group) continue;
        const [x1,y1] = anchorPt(src.absX, src.absY, 'parent_out', src.w, src.h);
        const [x2,y2] = anchorPt(me.absX,  me.absY,  'parent_in',  me.w, me.h);
        outConnections.push({ fromKey: src.key, toKey: me.key, x1, y1, x2, y2, type: 'blue', pathStyle: 'vhv' });
    }

    // below-connectors: draw as blue parent_out → parent_in
    for (const def of defs.filter(d => d.below && !d.parent)) {
        const src = nameMap.get(def.below!), me = nameMap.get(def.name);
        if (!src || !me) continue;
        const [x1,y1] = anchorPt(src.absX, src.absY, 'parent_out', src.w, src.h);
        const [x2,y2] = anchorPt(me.absX,  me.absY,  'parent_in',  me.w, me.h);
        outConnections.push({ fromKey: src.key, toKey: me.key, x1, y1, x2, y2, type: 'blue', pathStyle: 'vhv' });
    }

    // Shadow (green)
    for (const def of defs.filter(d => d.shadow)) {
        const src = nameMap.get(def.name), tgt = nameMap.get(def.shadow!);
        if (!src || !tgt) continue;
        const [x1,y1] = anchorPt(src.absX, src.absY, 'shadow_out', src.w, src.h);
        const [x2,y2] = anchorPt(tgt.absX, tgt.absY, 'shadow_in',  tgt.w, tgt.h);
        outConnections.push({ fromKey: src.key, toKey: tgt.key, x1, y1, x2, y2, type: 'green', pathStyle: 'vhv' });
    }

    // Neck (orange)
    for (const def of defs.filter(d => d.neck)) {
        const src = nameMap.get(def.name), tgt = nameMap.get(def.neck!);
        if (!src || !tgt) continue;
        const [x1,y1] = anchorPt(tgt.absX, tgt.absY, 'neck_out', tgt.w, tgt.h);
        const [x2,y2] = anchorPt(src.absX, src.absY, 'l_neck',   src.w, src.h);
        outConnections.push({ fromKey: tgt.key, toKey: src.key, x1, y1, x2, y2, type: 'orange', pathStyle: 'vh' });
    }

    return { groups: outGroups, standalones: outStandalones, connections: outConnections, keyMap };
}
