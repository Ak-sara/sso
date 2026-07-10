<script lang="ts">
    interface Props {
        x1: number; y1: number;
        x2: number; y2: number;
        type?:      'blue' | 'green' | 'orange';
        pathStyle?: 'vhv' | 'hvh' | 'vh' | 'stack';
        highlighted?: boolean; // touches the hovered node → bolder, full opacity
        dimmed?:      boolean; // some other node is hovered → faded out
    }
    import { DROP, STACK_TRUNK_OFFSET } from './layout';

    let { x1, y1, x2, y2, type = 'blue', pathStyle = 'vhv', highlighted = false, dimmed = false }: Props = $props();

    // first vertical segment differs per line type so parallel runs don't overlap.
    // note: orange never reaches the vhv branch — neck lines are 'vh', their drop
    // is baked into the neck node's y by layout.ts (DROP.orange)
    function buildPath(x1: number, y1: number, x2: number, y2: number, style: string): string {
        if (style === 'vh') {
            // vertical then horizontal: go to target y first, then across
            return `M${x1},${y1} L${x1},${y2} L${x2},${y2}`;
        }
        if (style === 'hvh') {
            const midX = (x1 + x2) / 2;
            return `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`;
        }
        if (style === 'stack') {
            // drop straight down off the parent's bottom border first (so the line doesn't
            // trace along it), then jog to a trunk a fixed offset left of the target column
            // (never inside its box, regardless of siblings above it), then in from the side
            const trunkX = x2 - STACK_TRUNK_OFFSET;
            const dropY  = y1 + Math.min(DROP[type], Math.abs(y2 - y1) / 2);
            return `M${x1},${y1} L${x1},${dropY} L${trunkX},${dropY} L${trunkX},${y2} L${x2},${y2}`;
        }
        // vhv: drop the type-specific distance, across, then down to target
        const dir = y2 >= y1 ? 1 : -1;
        const mid = y1 + dir * Math.min(DROP[type], Math.abs(y2 - y1) / 2);
        return `M${x1},${y1} L${x1},${mid} L${x2},${mid} L${x2},${y2}`;
    }

    const d       = $derived(buildPath(x1, y1, x2, y2, pathStyle));
    const color   = $derived(type === 'green' ? '#16a34a' : type === 'orange' ? '#e67e22' : '#2c7be5');
    const dashArr = $derived(type === 'green' ? '6 4' : type === 'orange' ? '2 4' : 'none');
    const width   = $derived(highlighted ? 3 : 1.5);
    const opacity = $derived(dimmed ? 0.15 : 1);
</script>

<path {d} fill="none" stroke={color} stroke-width={width} stroke-dasharray={dashArr}
      stroke-linecap="square" stroke-linejoin="miter" opacity={opacity} />
