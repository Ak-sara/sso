<script lang="ts">
    import { getContext, onMount } from 'svelte';
    import type { Snippet } from 'svelte';
    import { REGISTRY_CTX, type Registry, type AnchorType } from './registry';

    interface Props {
        x: number;
        y: number;
        W: number;
        H: number;
        label?: string;
        key?: string;
        has_shadow?: boolean; // sends shadow (outgoing) → bottom green dot
        has_child?: boolean;
        is_shadow?:  boolean; // receives shadow (incoming) → top green dot
        has_neck?:   boolean;
        l_neck?:     boolean;
        r_neck?:     boolean;
        has_parent?: boolean;
        children?: Snippet;
    }
    let { x, y, W, H, label, key,
          has_shadow = false, has_child=false, is_shadow = false,
          has_neck = false, l_neck = false, r_neck = false,
          has_parent = false, children }: Props = $props();

    const [blue,orange,green]=["#2c7be5","#e67e22","#16a34a"]
    const [T,R,B,L]=[0,W,H,0]

    // G uses absolute coords (x,y are already absolute — no parent transform)
    function getAnchor(type: AnchorType): [number, number] {
        if (type === 'parent_in')  return [x + W/2 - 8, y];
        if (type === 'parent_out') return [x + W/2 - 8, y + H];
        if (type === 'shadow_in')  return [x + W/2 + 8, y];
        if (type === 'shadow_out') return [x + W/2 + 8, y + H];
        if (type === 'neck_out')   return [x + W/2 + 12, y + H];
        if (type === 'l_neck')     return [x, y + H/2];
        if (type === 'r_neck')     return [x + W, y + H/2];
        return [x, y];
    }

    const registry = getContext<Registry>(REGISTRY_CTX);
    onMount(() => {
        if (key) registry?.register(key, { getAnchor });
        return () => { if (key) registry?.unregister(key); };
    });

    async function getAbsPosition() { return [x, y] }
    async function getRelPosition(_relativeTo: string) { return [x, y] }
    async function getWidth() { return W }
    async function setWidth(width: number) { W = width }
    async function getHeight() { return H }
    async function setHeight(height: number) { H = height }
</script>

<g transform="translate({x},{y})">
    <rect x="0" y="0" width={W} height={H} rx="8"
          fill="#f8faff55" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 3" />
    {#if label}
        <text x="30" y="16" text-anchor="middle"
              font-family="sans-serif" font-size="10" fill="#64748b" font-weight="600">
            {label}
        </text>
    {/if}
    {@render children?.()}

    {#if has_parent }<circle cx="{(W/2)-8}" cy="{T}" r="3" fill="{blue}"   />{/if}
    {#if has_child }<circle cx="{(W/2)-8}" cy="{B}" r="3" fill="{blue}"   />{/if}

    {#if has_shadow }<circle cx="{(W/2)+8}"  cy="{B}" r="3" fill="{green}"  />{/if}
    {#if is_shadow  }<circle cx="{(W/2)+8}"  cy="{T}" r="3" fill="{green}"  />{/if}
    {#if has_neck   }<circle cx="{(W/2)+12}" cy="{B}" r="3" fill="{orange}" />{/if}

    {#if l_neck }<circle cx="{L}" cy="{H/2}" r="3" fill="{orange}" />{/if}
    {#if r_neck }<circle cx="{R}" cy="{H/2}" r="3" fill="{orange}" />{/if}
</g>
