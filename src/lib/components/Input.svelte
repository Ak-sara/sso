<script lang="ts">
    interface Props {
		type: string;
        name?: string;
        style?: string;
		label?: string;
        value?: any;
        options?: Record<string,string>;
		onClick?: () => void;
        onChange?: () => void;
	}

	let { type,name,style,label,options,value = $bindable(), onClick, onChange }: Props = $props();
</script>

{#if type=="info"}
<div class="grid grid-cols-2 gap-4 my-2">
    <span class="font-medium text-gray-500">{label}</span>
	<span class="text-gray-900">{value}</span>
</div>
{/if}
{#if type=="avatar"}
    <div class="{style}">
        <img src="/1.gif" class="w-[120px] object-cover rounded-[50%]"/>
    </div>
{/if}
{#if type=="text"}
<div class="{style}">
    <label class="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input class="w-full px-3 py-2 border border-gray-300 rounded-md"
        type="text" name={name} bind:value={value}/>
</div>
{/if}
{#if type=="date" || type=="datetime"}
<div>
    <label class="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input type="hidden" name={name} bind:value={value}/>
    <div class="flex gap-2">
        <input class="px-3 py-2 border border-gray-300 rounded-md w-[15%]"
            type="number" name="d-{name}" value={value}/>
        <input class="px-3 py-2 border border-gray-300 rounded-md w-[15%]"
            type="number" name="m-{name}" value={value}/>
        <input class="px-3 py-2 border border-gray-300 rounded-md w-[15%]"
            type="number" name="y-{name}" value={value}/>
    {#if type=="datetime"}
        <input class="px-3 py-2 border border-gray-300 rounded-md w-[15%]"
            type="number" name="h-{name}" value={value}/>
        <input class="px-3 py-2 border border-gray-300 rounded-md w-[15%]"
            type="number" name="i-{name}" value={value}/>
        <input class="px-3 py-2 border border-gray-300 rounded-md w-[15%]"
            type="number" name="s-{name}" value={value}/>
    {/if}
    </div>
</div>
{/if}
{#if type=="select"}
<div>
    <label class="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select class="w-full px-3 py-2 border border-gray-300 rounded-md"
        name={name} bind:value={value} required >
        {#each Object.entries(options as Record<string,string>) as [key, v]}
            <option value={key} selected={ (v===value as string) ? true : false} >{v}</option>
        {/each}
    </select>
</div>
{/if}
{#if type=="multi-select"}
<div>
    <label class="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select class="w-full px-3 py-2 border border-gray-300 rounded-md"
        name={name}  bind:value={value} multiple>
        {#each Object.entries(options as Record<string,string>) as [key, v]}
            <option selected={ (value).indexOf(v)>=0 ? true : false} value={key} >{v}</option>
        {/each}
    </select>
</div>
{/if}
{#if type=="checkbox"}
<div>
    <label class="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <span class="flex items-center px-3 py-3">
        <input class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            type="checkbox" name={name} bind:checked={value} />
        <span class="ml-2 text-sm text-gray-900">{label}</span>
    </span>
</div>
{/if}
