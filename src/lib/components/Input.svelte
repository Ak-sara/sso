<script lang="ts">
    interface Props {
		type: string;
        name: string;
		label: string;
        value: any;
        options?: Record<string,string>;
		onSave?: () => void;
	}

	let { type,name,label,options,value = $bindable(), onSave }: Props = $props();
</script>

<div>
    <label class="block text-sm font-medium text-gray-700 mb-1">{label}</label>

{#if type=="text"}
    <input class="w-full px-3 py-2 border border-gray-300 rounded-md"
        name={name} type="{type}" bind:value={value}/>
{/if}
{#if type=="select"}
    <select class="w-full px-3 py-2 border border-gray-300 rounded-md"
        name={name} 
        bind:value={value} required >
        {#each Object.entries(options as Record<string,string>) as [key, value]}
            <option value={key}>{value}</option>
        {/each}
    </select>
{/if}
</div>