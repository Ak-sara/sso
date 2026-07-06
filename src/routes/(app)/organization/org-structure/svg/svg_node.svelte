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
        has_shadow?: boolean; // sends shadow (outgoing) → bottom green dot
        is_shadow?:  boolean; // receives shadow (incoming) → top green dot
        has_neck?:   boolean;
        l_neck?:     boolean;
        r_neck?:     boolean;
    }
    let { x = 0, y = 0, absX = x, absY = y, key, name, label, title,
          has_parent = false, has_child = false, has_shadow = false, is_shadow = false,
          has_neck = false, l_neck = false, r_neck = false }: Props = $props();

    const [blue,orange,green]=["#2c7be5","#e67e22","#16a34a"]
    const [T,R,B,L]=[0,160,60,0]
    const [W,H]=[R-L,B-T]

    function getAnchor(type: AnchorType): [number, number] {
        if (type === 'parent_in')  return [absX + W/2 - 8, absY + T];
        if (type === 'parent_out') return [absX + W/2 - 8, absY + B];
        if (type === 'shadow_in')  return [absX + W/2 + 8, absY + T];
        if (type === 'shadow_out') return [absX + W/2 + 8, absY + B];
        if (type === 'neck_out')   return [absX + W/2 + 12, absY + B];
        if (type === 'l_neck')     return [absX + L, absY + H/2];
        if (type === 'r_neck')     return [absX + R, absY + H/2];
        return [absX, absY];
    }

    const registry = getContext<Registry>(REGISTRY_CTX);
    onMount(() => {
        if (key) registry?.register(key, { getAnchor });
        return () => { if (key) registry?.unregister(key); };
    });
</script>

<g transform="translate({x},{y})">
    <rect x="0" y="0" width="{W}" height="{H}" rx="5" ry="5"
          fill="#ffffff55" stroke="{blue}" stroke-width="1.5" />
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
    <text x={(W/2)} y="{title?(H/2)+8:H/2}" text-anchor="middle" dominant-baseline="middle"
          font-family="sans-serif" font-size="12" font-weight="700" fill="#1a1a1a">
        {label}
    </text>

    {#if has_parent }<circle cx="{(W/2)-8}" cy="{T}" r="3" fill="{blue}"   />{/if}
    {#if has_child }<circle cx="{(W/2)-8}" cy="{B}" r="3" fill="{blue}"   />{/if}

    {#if has_shadow }<circle cx="{(W/2)+8}"  cy="{B}" r="3" fill="{green}"  />{/if}
    {#if is_shadow  }<circle cx="{(W/2)+8}"  cy="{T}" r="3" fill="{green}"  />{/if}
    {#if has_neck   }<circle cx="{(W/2)+12}" cy="{B}" r="3" fill="{orange}" />{/if}

    {#if l_neck }<circle cx="{L}" cy="{H/2}" r="3" fill="{orange}" />{/if}
    {#if r_neck }<circle cx="{R}" cy="{H/2}" r="3" fill="{orange}" />{/if}
</g>
