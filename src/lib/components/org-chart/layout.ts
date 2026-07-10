import type { AnchorType } from './registry';

export type NodeDef    = { name: string; label: string; group?: string; parent?: string; neck?: string; below?: string };
type        NameEntry  = { absX: number; absY: number; key: string; w: number; h: number };

export type LayoutNode = {
    name: string; label: string; key: string; lx: number; ly: number; absX: number; absY: number;
    has_parent?: boolean; has_child?: boolean; has_below?: boolean; is_below?: boolean; has_neck?: boolean; l_neck?: boolean;
    is_stack_child?: boolean; // left dot — receives its parent connector from the side instead of the top
};
export type LayoutGroup = {
    name: string; label: string; key: string; x: number; y: number; w: number; h: number; nodes: LayoutNode[];
    has_parent?: boolean; is_below?: boolean; has_below?: boolean; has_child?: boolean; has_neck?: boolean; l_neck?: boolean;
};
export type LayoutAlone = {
    name: string; label: string; key: string; x: number; y: number;
    has_parent?: boolean; has_child?: boolean; has_below?: boolean; is_below?: boolean; has_neck?: boolean; l_neck?: boolean;
    is_stack_child?: boolean; // left dot — receives its parent connector from the side instead of the top
};
export type Connection = {
    fromKey: string; toKey: string; x1: number; y1: number; x2: number; y2: number;
    type: 'blue' | 'green' | 'orange'; pathStyle: 'vhv' | 'hvh' | 'vh' | 'stack';
};

const NW = 160, NH = 60, H_GAP = 40, V_GAP = 40, G_PAD = 24, G_GAP = 60;
export const DROP = { blue: 22, green: 18, orange: 16 } as const;
export const STACK_TRUNK_OFFSET = 40; // how far left of the column the shared trunk line runs — must clear G_PAD so it doesn't ride along a group's border

export function anchorPt(absX: number, absY: number, a: AnchorType, w = NW, h = NH): [number, number] {
    if (a === 'parent_in')  return [absX + w/2 - 8,  absY];
    if (a === 'parent_out') return [absX + w/2 - 8,  absY + h];
    if (a === 'below_in')   return [absX + w/2 + 8,  absY];
    if (a === 'below_out')  return [absX + w/2 + 8,  absY + h];
    if (a === 'neck_out')   return [absX + w/2 + 12, absY + h];
    if (a === 'l_neck')     return [absX,             absY + h/2];
    if (a === 'r_neck')     return [absX + w,         absY + h/2];
    if (a === 'stack_in')   return [absX,             absY + h/2];
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
    const belowSources = new Set(defs.filter(m => m.below).map(m => m.name));   // owns .below (placed below its target)
    const belowTargets = new Set(defs.filter(m => m.below).map(m => m.below!)); // referenced by .below (has something below it)
    const neckTargets  = new Set(defs.filter(m => m.neck).map(m => m.neck!));

    const outGroups:      LayoutGroup[] = [];
    const outStandalones: LayoutAlone[] = [];
    const outConnections: Connection[]  = [];
    const nameMap = new Map<string, NameEntry>();
    const keyMap  = new Map<string, LayoutNode | LayoutGroup | LayoutAlone>();

    // ── Pass 1: Build Col tree ────────────────────────────────────────────────

    // lpos entry: node position inside its parent group box
    type LPos = { lx: number; ly: number; slotLeft: number; slotW: number };
    // inner layout result for a group box
    // maxSlotRight: rightmost edge counting members' *reserved* columns (which include
    // their own hanging children, e.g. "Commercial Directorate" under a member) — wider
    // than boxW alone, which only wraps the members' own small boxes.
    type IL   = { boxW: number; boxH: number; lpos: Map<string, LPos>; maxSlotRight: number };

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
        stackedChild?: boolean; // true when placed as part of a vertical sibling stack
    };

    const colMap = new Map<string, Col>();
    for (const def of defs) {
        colMap.set(def.name, {
            def, isBox: defs.some(d => d.group === def.name),
            members: [], children: [],
            slotW: 0, boxW: 0, boxH: 0, innerH: 0, totalH: 0, absX: 0, absY: 0,
        });
    }

    // A def is deferred (skipped here, placed independently after the main layout via
    // deferredCols below) rather than wired into some col's `children` when either:
    // - both `below` and `parent` are set — its own subtree can be arbitrarily large, and
    //   folding it into the below target's column would inflate that column's reserved
    //   width, skewing the whole row (e.g. a "SBU" hanging off a specific director); or
    // - its resolved target (below, else parent) is itself a box — attaching directly to a
    //   box's own children (rather than one of its members) can't be centered safely
    //   without knowing every member's own hanging subtree, so it's positioned
    //   independently instead (e.g. a group hung directly off "Directorate").
    const isDeferred = (def: NodeDef): boolean => {
        if (def.group) return false;
        if (def.below && def.parent) return true;
        const target = def.below ?? def.parent;
        return !!target && !!colMap.get(target)?.isBox;
    };

    // Wire members and external children
    for (const def of defs) {
        // member of a group box
        if (def.group) colMap.get(def.group)?.members.push(colMap.get(def.name)!);
        if (def.group) continue;
        if (isDeferred(def)) continue;
        if (def.below)       colMap.get(def.below)?.children.push(colMap.get(def.name)!);
        else if (def.parent) colMap.get(def.parent)?.children.push(colMap.get(def.name)!);
    }

    // ── Pass 2: Bottom-up slot widths ─────────────────────────────────────────

    const sumW = (cols: Col[], gap: number) =>
        cols.length ? cols.reduce((s, c) => s + c.slotW, 0) + (cols.length - 1) * gap : 0;

    // A run of ≥4 childless leaf siblings reads better as a vertical stack than a
    // wide horizontal row — keeps the diagram from sprawling sideways.
    const STACK_THRESHOLD = 4;
    // "has a child" for stacking purposes means anything points to it via `parent`,
    // even when that child is actually rendered as a group member elsewhere
    // (e.g. GMCO → BO's regional-station members) rather than wired as col.children.
    const hasAnyChild = (name: string) => defs.some(d => d.parent === name);
    function stacksVertically(children: Col[]): boolean {
        return children.length >= STACK_THRESHOLD && children.every(c => !c.isBox && !hasAnyChild(c.def.name));
    }

    // Bottom-up: total footprint a children group occupies (single column when stacked).
    function childrenSize(children: Col[]): { w: number; h: number } {
        if (!children.length) return { w: 0, h: 0 };
        if (stacksVertically(children)) {
            return { w: NW, h: children.length * NH + (children.length - 1) * V_GAP };
        }
        return { w: sumW(children, G_GAP), h: Math.max(...children.map(c => c.totalH)) };
    }

    // Top-down: place a children group, centered within `avail` width starting at (startX, startY).
    function placeChildren(children: Col[], startX: number, avail: number, startY: number) {
        if (!children.length) return;
        if (stacksVertically(children)) {
            const cx = startX + (avail - NW) / 2;
            let cy = startY;
            for (const ch of children) { ch.stackedChild = true; assignCoords(ch, cx, cy); cy += NH + V_GAP; }
            return;
        }
        const total = sumW(children, G_GAP);
        let cx = startX + (avail - total) / 2;
        for (const ch of children) { assignCoords(ch, cx, startY); cx += ch.slotW + G_GAP; }
    }

    // Build internal layout for a group box.
    // Each member's slot width = max(NW, its external children's total width).
    // Internal parent-child ordering determines row structure.
    function buildIL(col: Col): IL {
        if (col.il) return col.il;
        const mems = col.members;
        if (!mems.length) {
            col.il = { boxW: NW + G_PAD * 2, boxH: NH + G_PAD * 2, lpos: new Map(), maxSlotRight: NW };
            return col.il;
        }
        const memSet = new Set(mems.map(m => m.def.name));
        const roots  = mems.filter(m => !m.def.parent || !memSet.has(m.def.parent));
        const isLeafMember = (m: Col) => !m.isBox && !hasAnyChild(m.def.name);

        // Slot width for a member inside the group, accounting for its external children
        function mSlotW(m: Col): number {
            const extW = childrenSize(m.children).w;
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

        // ≥4 childless root members (e.g. "Man Power Directorate"'s 4 divisions) stack
        // vertically in one column instead of widening the box into a long row.
        if (roots.length >= STACK_THRESHOLD && roots.every(isLeafMember)) {
            roots.forEach((r, i) => { r.stackedChild = true; placeM(r, 0, i); });
        } else {
            const rW = roots.reduce((s, r) => s + mSlotW(r), 0) + (roots.length - 1) * H_GAP;
            let rx = (Math.max(NW, rW) - rW) / 2;
            for (const r of roots) { placeM(r, rx, 0); rx += mSlotW(r) + H_GAP; }
        }

        const maxLx = Math.max(...mems.map(m => lpos.get(m.def.name)!.lx + NW));
        const maxLy = Math.max(...mems.map(m => lpos.get(m.def.name)!.ly + NH));
        const maxSlotRight = Math.max(...mems.map(m => {
            const lp = lpos.get(m.def.name)!;
            return lp.slotLeft + lp.slotW;
        }));
        col.il = { boxW: maxLx + G_PAD * 2, boxH: maxLy + G_PAD * 2, lpos, maxSlotRight };
        return col.il;
    }

    const computed = new Set<string>();
    function computeCol(col: Col) {
        if (computed.has(col.def.name)) return;
        computed.add(col.def.name);
        // Recurse members first (they own their children's slotW too)
        for (const m of col.members) computeCol(m);
        for (const c of col.children) computeCol(c);

        let memberSpread = 0;
        if (col.isBox || col.members.length) {
            const il = buildIL(col);
            col.boxW = il.boxW;
            col.boxH = il.boxH;
            // The box gets centered within col.slotW later (gAX = slotLeft + (slotW-boxW)/2),
            // so reserving just past a member's own right edge isn't enough — solving
            // "member's absolute right edge <= slotLeft + slotW" for slotW, accounting for
            // that centering shift, gives slotW >= 2*(G_PAD + maxSlotRight) - boxW.
            memberSpread = 2 * (G_PAD + il.maxSlotRight) - il.boxW;
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
        const ext = childrenSize(col.children);
        col.totalH = col.children.length ? col.innerH + G_GAP + ext.h : col.innerH;
        // slotW must also cover the widest column reserved for any member's own hanging
        // subtree (e.g. "Commercial Directorate" under a member) — boxW alone only wraps
        // the members' own small boxes, and would otherwise let that subtree overflow past
        // whatever comes next in the layout.
        col.slotW  = Math.max(col.boxW, memberSpread, ext.w || col.boxW);
    }

    // ── Pass 3: Top-down coordinate assignment ────────────────────────────────

    function assignCoords(col: Col, slotLeft: number, y: number) {
        col.absX = slotLeft;
        col.absY = y;

        // Place direct external children below this box AND below any member subtrees
        placeChildren(col.children, slotLeft, col.slotW, y + col.innerH + G_GAP);

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
                placeChildren(m.children, gAX + lp.slotLeft + G_PAD, lp.slotW, m.absY + NH + G_GAP);
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
                has_below:  belowTargets.has(m.def.name),
                is_below:   belowSources.has(m.def.name),
                has_neck:   neckTargets.has(m.def.name),
                is_stack_child: !!m.stackedChild,
            };
        });

        const g: LayoutGroup = {
            name: col.def.name, label: col.def.label, key: gKey,
            x: gAX, y: gAY, w: col.boxW, h: col.boxH, nodes,
            has_parent: !!col.def.parent && defs.some(d => d.name === col.def.parent),
            is_below:   belowSources.has(col.def.name),
            has_below:  belowTargets.has(col.def.name),
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
            has_parent: !!col.def.parent,
            has_child:  col.children.length > 0,
            has_below:  belowTargets.has(col.def.name),
            is_below:   belowSources.has(col.def.name),
            has_neck:   neckTargets.has(col.def.name),
            is_stack_child: !!col.stackedChild,
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

    // Fully unrelated nodes (no parent/group/below/neck, and nothing points at them either)
    // read as loose floaters wherever they land in the normal left-to-right flow — pull them
    // into their own horizontal row above everything else instead.
    const isOrphan = (def: NodeDef) =>
        !def.group && !def.parent && !def.below && !def.neck &&
        !defs.some(d => d.parent === def.name || d.below === def.name || d.neck === def.name || d.group === def.name);
    const orphanCols = topLevel.filter(c => isOrphan(c.def));
    const mainCols    = topLevel.filter(c => !isOrphan(c.def));

    let orphanRowH = 0;
    if (orphanCols.length) {
        let ox = G_PAD;
        for (const col of orphanCols) {
            computeCol(col);
            assignCoords(col, ox, G_PAD);
            emitCol(col);
            ox += col.slotW + G_GAP;
        }
        orphanRowH = NH + G_GAP;
    }

    let cursorX = G_PAD;
    for (const col of mainCols) {
        computeCol(col);
        assignCoords(col, cursorX, G_PAD + orphanRowH);
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

    // Deferred cols (skipped in Pass 1 wiring, see isDeferred above): place them after
    // everything else, below their resolved target's row, so their own subtree size never
    // inflates that target's column/row width.
    const deferredCols = [...colMap.values()].filter(c => isDeferred(c.def));
    for (const col of deferredCols) {
        computeCol(col);
        const targetName = col.def.below ?? col.def.parent;
        const tgt = targetName ? nameMap.get(targetName) : undefined;
        const py = tgt ? tgt.absY + tgt.h + G_GAP : G_PAD;
        assignCoords(col, cursorX, py);
        emitCol(col);
        cursorX += col.slotW + G_GAP;
    }

    // ── Connections (cross-box blue, below green, neck orange) ───────────────

    const stackedNames = new Set([...colMap.values()].filter(c => c.stackedChild).map(c => c.def.name));

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
        // Stacked siblings sit directly below one another in one column — entering from
        // the top would draw the line straight through the sibling(s) above. Enter from
        // the side instead so it clears their boxes.
        if (stackedNames.has(def.name)) {
            const [x2,y2] = anchorPt(me.absX, me.absY, 'stack_in', me.w, me.h);
            outConnections.push({ fromKey: src.key, toKey: me.key, x1, y1, x2, y2, type: 'blue', pathStyle: 'stack' });
            continue;
        }
        const [x2,y2] = anchorPt(me.absX,  me.absY,  'parent_in',  me.w, me.h);
        outConnections.push({ fromKey: src.key, toKey: me.key, x1, y1, x2, y2, type: 'blue', pathStyle: 'vhv' });
    }

    // below-connectors (green): target's bottom (below_out) → owner's top (below_in)
    for (const def of defs.filter(d => d.below)) {
        const src = nameMap.get(def.below!), me = nameMap.get(def.name);
        if (!src || !me) continue;
        const [x1,y1] = anchorPt(src.absX, src.absY, 'below_out', src.w, src.h);
        const [x2,y2] = anchorPt(me.absX,  me.absY,  'below_in',  me.w, me.h);
        outConnections.push({ fromKey: src.key, toKey: me.key, x1, y1, x2, y2, type: 'green', pathStyle: 'vhv' });
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
