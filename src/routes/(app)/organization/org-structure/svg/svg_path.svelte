<script lang="ts">
    interface Props {
        x1: number; y1: number;
        x2: number; y2: number;
    }
    let { x1, y1, x2, y2 }: Props = $props();
    // S-curve: control points go straight down then straight up to meet target
    const mid = $derived((y1 + y2) / 2);
    const d   = $derived(`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`);
</script>

<!-- Always at SVG root level — coordinates are absolute, not affected by any parent <g> -->
<path {d} fill="none" stroke="#2c7be5" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" />
