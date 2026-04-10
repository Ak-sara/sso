<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { useLogger } from '$lib/logger';
	

	const log = useLogger({ module: 'app:_unused:page' });
	let { data, form }: { data: PageData; form?: ActionData } = $props();

    const result=data.params
    // log.debug('page_load',{data})
    // async function saveChanges() {
    //     const response = await fetch('?/create', { method: 'POST', body: formData });
    //     const result = await response.json();
    // }
</script>


<div class="space-y-6">

	<pre>{JSON.stringify(result,null,2)}</pre>

</div>