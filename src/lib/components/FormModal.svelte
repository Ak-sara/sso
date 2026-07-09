<script lang="ts">
    interface Props {  onClose?: () => void; title:string; subtitle?:string; nested?:boolean; wide?:boolean; }
    let {  onClose, title="", subtitle="", nested=false, wide=false }:Props = $props();

    function handleClose(e: Event) {
        e.stopPropagation();
        onClose?.();
    }
</script>


<div class="fixed inset-0 w-full flex items-center justify-center bg-[rgba(0,0,0,0.5)] {nested ? "z-[60]": "z-[50]"}"
	onclick={handleClose} role="dialog" tabindex="0">
	<div class="bg-white rounded-lg shadow-2xl w-full max-h-[90vh] overflow-auto {wide ? 'max-w-6xl' : 'max-w-4xl'}"
		onclick={(e) => e.stopPropagation()} role="document" >
		<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between {nested ? "z-[61]": "z-[51]"}">
			<div>
				<h3 class="text-xl font-bold">{title}</h3>
				{#if subtitle!="" } <p class="text-sm text-gray-500">{subtitle}</p>{/if}
			</div>
			<button type="button" onclick={handleClose} title={title} class="text-gray-400 hover:text-gray-600 text-2xl" > &times; </button>
		</div>

        <slot/>
	</div>
</div>
