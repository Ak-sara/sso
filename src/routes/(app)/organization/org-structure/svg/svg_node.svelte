<script lang="ts">
    interface Props {
        x?: number;
        y?: number;
        name?: string;
        label?: string;
        title?: string;
    }
    let { x = 0, y = 0, name, label,title }: Props = $props();
    let [has_neck,l_neck,r_neck,has_shadow,is_shadow]=[false,false,false,false,false]

    const [blue,orange,green]=["#2c7be5","#e67e22","#16a34a"]
    const [T,R,B,L]=[0,160,60,0]
    const [W,H]=[R-L,B-T]
    
    // Node always draws at its own (0,0); position comes from transform.
    // When inside <G>, this stacks on top of G's transform → absolute = G.pos + (x,y).
</script>

<g transform="translate({x},{y})">
    <rect x="0" y="0" width="{W}" height="{H}" rx="5" ry="5"
          fill="#ffffff" stroke="{blue}" stroke-width="1.5" />
{#if title}    
    <defs>
        <clipPath id="clip-{name}">
            <rect x="0" y="0" width="{W}" height="{H}" rx="5" ry="5" />
        </clipPath>
    </defs>
    <rect x="0" y="0" width="{W}" height="16" fill="{blue}" clip-path="url(#clip-{name})" />
    <text x="80" y="8" text-anchor="middle" dominant-baseline="middle"
          font-family="sans-serif" font-size="9" font-weight="700" fill="#ffffff" letter-spacing="0.8">
        {title}
    </text>
{/if}

    <text x="80" y="{title?(H/2)+8:H/2}" text-anchor="middle" dominant-baseline="middle"
          font-family="sans-serif" font-size="12" font-weight="700" fill="#1a1a1a">
        {label}
    </text>
    <!-- connector dots: top = incoming, bottom = outgoing -->
    <circle cx="{(W/2)-8}" cy="{T}" r="3" fill="{blue}" />
    <circle cx="{(W/2)-8}" cy="{B}" r="3" fill="{blue}" />

    {#if has_shadow }<circle cx="{(W/2)+8}" cy="{T}" r="3" fill="{green}" />{/if}
    {#if is_shadow }<circle cx="{(W/2)+8}" cy="{B}" r="3" fill="{green}" />{/if}
    {#if has_neck }
        <circle cx="{(W/2)+12}" cy="{B}" r="3" fill="{orange}" />
    {/if}
    {#if l_neck || r_neck }
        {#if l_neck }<circle cx="{L}" cy="{H/2}" r="3" fill="{orange}" /> {/if}
        {#if r_neck }<circle cx="{R}" cy="{H/2}" r="3" fill="{orange}" /> {/if}
    {/if}
</g>
