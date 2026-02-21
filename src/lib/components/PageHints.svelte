<script lang="ts">
    interface PH {
		visible?: boolean;
		title: string;
		paragraph: string;
	}
    let {
        visible= $bindable(),
		title= "",
		paragraph= ""
    }:PH = $props();
</script>
{#if visible}
<div class="fixed inset-0 z-50 overflow-y-auto bg-[rgba(0,0,0,0.9)]">
	<div class="flex items-center justify-center min-h-screen px-4 md:px-8">
		<button onclick={() => (visible = false)} class="fixed inset-0"></button>
		<div class="relative bg-white rounded-lg shadow-xl w-full p-3 z-10">
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<h3 class="text-sm font-medium text-blue-800">{title}</h3>
				<p class="mt-1 text-sm text-blue-700">
					{@html paragraph}
				</p>
			</div>
		</div>
	</div>
</div>
{/if}