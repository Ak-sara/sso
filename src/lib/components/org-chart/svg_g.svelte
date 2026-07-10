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
        has_below?: boolean; // has something below it (outgoing) → bottom green dot
        has_child?: boolean;
        is_below?:  boolean; // is below its target (incoming) → top green dot
        has_neck?:   boolean;
        l_neck?:     boolean;
        r_neck?:     boolean;
        has_parent?: boolean;
        children?: Snippet;
        hovered?: boolean; // this box is the hover target → bolder border
        onnodeenter?: (key: string) => void;
        onnodeleave?: () => void;
    }
    let { x, y, W, H, label, key,
          has_below = false, has_child=false, is_below = false,
          has_neck = false, l_neck = false, r_neck = false,
          has_parent = false, children,
          hovered = false, onnodeenter, onnodeleave }: Props = $props();

    const [blue,orange,green]=["#2c7be5","#e67e22","#16a34a"]
    const [T,R,B,L]=[0,W,H,0]

    // G uses absolute coords (x,y are already absolute — no parent transform)
    function getAnchor(type: AnchorType): [number, number] {
        if (type === 'parent_in')  return [x + W/2 - 8, y];
        if (type === 'parent_out') return [x + W/2 - 8, y + H];
        if (type === 'below_in')   return [x + W/2 + 8, y];
        if (type === 'below_out')  return [x + W/2 + 8, y + H];
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

<g transform="translate({x},{y})" data-id={key} class="cursor-pointer"
   onmouseenter={() => key && onnodeenter?.(key)} onmouseleave={() => onnodeleave?.()}>
    <rect x="0" y="0" width={W} height={H} rx="8"
          fill="#f8faff55" stroke={hovered ? '#2c7be5' : '#cbd5e1'} stroke-width={hovered ? 2.5 : 1.5} stroke-dasharray="4 3" />
    {#if label}
        <foreignObject x="4" y="2" width="{W - 8}" height="16">
            <div xmlns="http://www.w3.org/1999/xhtml" title={label}
                 style="width:100%; height:100%; display:flex; align-items:center;
                        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
                        font-family:sans-serif; font-size:10px; font-weight:600; color:#64748b;">
                {label}
            </div>
        </foreignObject>
    {/if}
    {@render children?.()}

    {#if has_parent }<circle cx="{(W/2)-8}" cy="{T}" r="3" fill="{blue}"   />{/if}
    {#if has_child }<circle cx="{(W/2)-8}" cy="{B}" r="3" fill="{blue}"   />{/if}

    {#if has_below }<circle cx="{(W/2)+8}"  cy="{B}" r="3" fill="{green}"  />{/if}
    {#if is_below  }<circle cx="{(W/2)+8}"  cy="{T}" r="3" fill="{green}"  />{/if}
    {#if has_neck   }<circle cx="{(W/2)+12}" cy="{B}" r="3" fill="{orange}" />{/if}

    {#if l_neck }<circle cx="{L}" cy="{H/2}" r="3" fill="{orange}" />{/if}
    {#if r_neck }<circle cx="{R}" cy="{H/2}" r="3" fill="{orange}" />{/if}
</g>
