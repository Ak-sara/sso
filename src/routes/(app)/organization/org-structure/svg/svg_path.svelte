<script lang="ts">
    interface Props {
        x1: number; y1: number;
        x2: number; y2: number;
        type?:      'blue' | 'green' | 'orange';
        pathStyle?: 'vhv' | 'hvh' | 'vh';
    }
    let { x1, y1, x2, y2, type = 'blue', pathStyle = 'vhv' }: Props = $props();

    function buildPath(x1: number, y1: number, x2: number, y2: number, style: string): string {
        if (style === 'vh') {
            // vertical then horizontal: go to target y first, then across
            return `M${x1},${y1} L${x1},${y2} L${x2},${y2}`;
        }
        if (style === 'hvh') {
            const midX = (x1 + x2) / 2;
            return `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`;
        }
        // vhv: go halfway down, across, then down to target
        const mid = (y1 + y2) / 2;
        return `M${x1},${y1} L${x1},${mid} L${x2},${mid} L${x2},${y2}`;
    }

    const d       = $derived(buildPath(x1, y1, x2, y2, pathStyle));
    const color   = $derived(type === 'green' ? '#16a34a' : type === 'orange' ? '#e67e22' : '#2c7be5');
    const dashArr = $derived(type === 'green' ? '6 4' : type === 'orange' ? '2 4' : 'none');
</script>

<path {d} fill="none" stroke={color} stroke-width="1.5" stroke-dasharray={dashArr}
      stroke-linecap="square" stroke-linejoin="miter" />
