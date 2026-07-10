<script lang="ts">
    import { getContext, onMount } from 'svelte';
    import { REGISTRY_CTX, type Registry, type AnchorType } from './registry';

    interface Props {
        x?: number;
        y?: number;
        absX?: number;
        absY?: number;
        key?: string;
        name?: string;
        label?: string;
        title?: string;
        has_parent?: boolean;
        has_child?: boolean;
        has_below?: boolean; // has something below it (outgoing) → bottom green dot
        is_below?:  boolean; // is below its target (incoming) → top green dot
        has_neck?:   boolean;
        l_neck?:     boolean;
        r_neck?:     boolean;
        is_stack_child?: boolean; // receives its parent connector from the left → left dot
        hovered?: boolean; // this node is the hover target → bolder border
        onnodeenter?: (key: string) => void;
        onnodeleave?: () => void;
    }
    let { x = 0, y = 0, absX = x, absY = y, key, name, label, title,
          has_parent = false, has_child = false, has_below = false, is_below = false,
          has_neck = false, l_neck = false, r_neck = false, is_stack_child = false,
          hovered = false, onnodeenter, onnodeleave }: Props = $props();

    const [blue,orange,green]=["#2cabfa","#e67e22","#16a34a"]
    const [T,R,B,L]=[0,160,60,0]
    const [W,H]=[R-L,B-T]

    function getAnchor(type: AnchorType): [number, number] {
        if (type === 'parent_in')  return [absX + W/2 - 8, absY + T];
        if (type === 'parent_out') return [absX + W/2 - 8, absY + B];
        if (type === 'below_in')   return [absX + W/2 + 8, absY + T];
        if (type === 'below_out')  return [absX + W/2 + 8, absY + B];
        if (type === 'neck_out')   return [absX + W/2 + 12, absY + B];
        if (type === 'l_neck')     return [absX + L, absY + H/2];
        if (type === 'r_neck')     return [absX + R, absY + H/2];
        if (type === 'stack_in')   return [absX + L, absY + H/2];
        return [absX, absY];
    }

    const registry = getContext<Registry>(REGISTRY_CTX);
    onMount(() => {
        if (key) registry?.register(key, { getAnchor });
        return () => { if (key) registry?.unregister(key); };
    });
</script>

<g transform="translate({x},{y})" data-id={name} class="cursor-pointer"
   onmouseenter={() => key && onnodeenter?.(key)} onmouseleave={() => onnodeleave?.()}>
    <rect x="0" y="0" width="{W}" height="{H}" rx="5" ry="5"
          fill="#ffffff55" stroke="{blue}" stroke-width={hovered ? 3 : 1.5} />
{#if title}
    <defs>
        <clipPath id="clip-{name}">
            <rect x="0" y="0" width="{W}" height="{H}" rx="5" ry="5" />
        </clipPath>
    </defs>
    <rect x="0" y="0" width="{W}" height="16" fill="{blue}" clip-path="url(#clip-{name})" />
    <text x={(W/2)} y="8" text-anchor="middle" dominant-baseline="middle"
          font-family="sans-serif" font-size="9" font-weight="700" fill="#ffffff55" letter-spacing="0.8">
        {title}
    </text>
{/if}
    <foreignObject x="4" y="{title ? 16 : 0}" width="{W - 8}" height="{title ? H - 16 : H}">
        <div xmlns="http://www.w3.org/1999/xhtml" title={label}
             style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;
                    text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
                    font-family:sans-serif; font-size:12px; font-weight:700; color:#1a1a1a;">
            {label}
        </div>
    </foreignObject>

    {#if has_parent && !is_stack_child }<circle cx="{(W/2)-8}" cy="{T}" r="3" fill="{blue}"   />{/if}
    {#if has_child }<circle cx="{(W/2)-8}" cy="{B}" r="3" fill="{blue}"   />{/if}

    {#if has_below }<circle cx="{(W/2)+8}"  cy="{B}" r="3" fill="{green}"  />{/if}
    {#if is_below  }<circle cx="{(W/2)+8}"  cy="{T}" r="3" fill="{green}"  />{/if}
    {#if has_neck   }<circle cx="{(W/2)+12}" cy="{B}" r="3" fill="{orange}" />{/if}

    {#if l_neck }<circle cx="{L}" cy="{H/2}" r="3" fill="{orange}" />{/if}
    {#if r_neck }<circle cx="{R}" cy="{H/2}" r="3" fill="{orange}" />{/if}
    {#if is_stack_child }<circle cx="{L}" cy="{H/2}" r="3" fill="{blue}" />{/if}
</g>
