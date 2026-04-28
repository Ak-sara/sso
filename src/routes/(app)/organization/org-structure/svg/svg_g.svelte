<script lang="ts">
    import type { Snippet } from 'svelte';
    interface Props {
        x: number;
        y: number;
        w: number;
        h: number;
        label?: string;
        children?: Snippet;
    }
    let { x, y, w, h, label, children }: Props = $props();
</script>

<!--
  transform="translate(x,y)" shifts the coordinate origin for everything inside.
  Child <Node x=lx y=ly> renders at absolute position (x+lx, y+ly) automatically.
-->
<g transform="translate({x},{y})">
    <rect x="0" y="0" width={w} height={h} rx="8"
          fill="#f8faff" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 3" />
    {#if label}
        <text x="30" y="16" text-anchor="middle"
              font-family="sans-serif" font-size="10" fill="#64748b" font-weight="600">
            {label}
        </text>
    {/if}
    {@render children?.()}
</g>
