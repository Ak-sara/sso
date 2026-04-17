<script lang="ts">
    interface Props {
		type: string;
        name?: string;
        style?: string;
		label?: string;
		placeholder?: string;
        value?: any;
        options?: Record<string,string>;
		onClick?: () => void;
        onChange?: () => void;
	}

	let { type,name,style,label,placeholder,options,value = $bindable(), onClick, onChange }: Props = $props();
    let datecols=type=="date"? "3":(type=="datetime"? "6":undefined);

    // --- date / datetime reactive parts ---
    function parseDate(v: any) {
        if (!v) return { d: '', m: '', y: '', h: '', i: '', s: '' };
        const dt = new Date(v);
        if (isNaN(dt.getTime())) return { d: '', m: '', y: '', h: '', i: '', s: '' };
        return {
            d: dt.getDate(),
            m: dt.getMonth() + 1,
            y: dt.getFullYear(),
            h: dt.getHours(),
            i: dt.getMinutes(),
            s: dt.getSeconds(),
        };
    }

    const init = parseDate(value);
    let d = $state<number|''>(init.d);
    let m = $state<number|''>(init.m);
    let y = $state<number|''>(init.y);
    let h = $state<number|''>(init.h);
    let i = $state<number|''>(init.i);
    let s = $state<number|''>(init.s);

    let formatted = $derived.by(() => {
        if (d === '' || m === '' || y === '') return '';
        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const yyyy = String(y).padStart(4, '0');
        if (type === 'datetime') {
            const hh = String(h || 0).padStart(2, '0');
            const ii = String(i || 0).padStart(2, '0');
            const ss = String(s || 0).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}T${hh}:${ii}:${ss}`;
        }
        return `${yyyy}-${mm}-${dd}`;
    });
    const today = () => {
        const now = new Date();
        d = now.getDate(); m = now.getMonth() + 1; y = now.getFullYear();
        if (type === 'datetime') { h = now.getHours(); i = now.getMinutes(); s = now.getSeconds(); }
    };
    
    $effect(() => {
        if (type === 'date' || type === 'datetime') {
            value = formatted;
            onChange?.();
        }
    });
</script>

{#if type=="info"}
<div class="grid grid-cols-[1fr_3fr] my-1 items-center">
    <span class="text-xs text-gray-500">{label}</span>
	<span class="text-gray-900">{value}</span>
</div>
{/if}
{#if type=="avatar"}
    <div class="{style}">
        <img src="/1.gif" class="w-[110px] object-cover rounded-[50%]"/>
    </div>
{/if}
{#if type=="text"}
<div class="{style}">
    <label class="block text-xs font-medium text-gray-700 mt-1 ml-1 mb-[-.1em]">{label}</label>
    <input class="w-full px-2 py-1 border border-gray-300 rounded-md"
        type="text" name={name} placeholder={placeholder} bind:value={value}/>
</div>
{/if}
{#if type=="date" || type=="datetime"}
<div class="{style}">
    <label class="flex justify-between text-xs font-medium text-gray-700 mt-1 ml-1 mb-[-.1em]">
        {label}
        <span class="flex gap-2">
            {#if formatted !== ''}
            <a class="text-xs text-gray-400 hover:text-red-500 hover:cursor-pointer"
               onclick={() => { d = ''; m = ''; y = ''; h = ''; i = ''; s = ''; }}>×</a>
            {/if}
            <a class="text-xs text-blue-700 hover:cursor-pointer" onclick={today}>Today</a>
        </span>
    </label>
    <input type="hidden" name={name} value={formatted}/>
    <div class="grid grid-cols-{datecols} gap-2">
        <input type="number" placeholder="DD"   min="1" max="31" bind:value={d} class="px-2 py-1 border border-gray-300 rounded-md text-center" />
        <input type="number" placeholder="MM"   min="1" max="12" bind:value={m} class="px-2 py-1 border border-gray-300 rounded-md text-center" />
        <input type="number" placeholder="YYYY" min="1900" max="2999" bind:value={y} class="px-2 py-1 border border-gray-300 rounded-md text-center" />
    {#if type=="datetime"}
        <input type="number" placeholder="HH" min="0" max="23" bind:value={h} class="px-2 py-1 border border-gray-300 rounded-md text-center" />
        <input type="number" placeholder="MM" min="0" max="59" bind:value={i} class="px-2 py-1 border border-gray-300 rounded-md text-center" />
        <input type="number" placeholder="SS" min="0" max="59" bind:value={s} class="px-2 py-1 border border-gray-300 rounded-md text-center" />
    {/if}
    </div>
</div>
{/if}
{#if type=="select"}
<div>
    <label class="block text-xs font-medium text-gray-700 mt-1 ml-1 mb-[-.1em]">{label}</label>
    <select class="w-full px-2 py-1 border border-gray-300 rounded-md"
        name={name} bind:value={value} required >
        {#each Object.entries(options as Record<string,string>) as [key, v]}
            <option value={key} selected={ (v===value as string) ? true : false} >{v}</option>
        {/each}
    </select>
</div>
{/if}
{#if type=="multi-select"}
<div class="{style}">
    <label class="block text-xs font-medium text-gray-700 mt-1 ml-1 mb-[-.1em]">{label}</label>
    <input type="hidden" name={name} value={JSON.stringify(Array.isArray(value) ? value : [])}/>
    <div class="border border-gray-300 rounded-md divide-y divide-gray-100">
        {#each Object.entries(options as Record<string,string>) as [key, v]}
            {@const checked = Array.isArray(value) && value.includes(key)}
            <label class="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-50">
                <input class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    type="checkbox" value={key} {checked}
                    onchange={(e) => {
                        const v = Array.isArray(value) ? [...value] : [];
                        if ((e.target as HTMLInputElement).checked) {
                            if (!v.includes(key)) v.push(key);
                        } else {
                            const idx = v.indexOf(key);
                            if (idx >= 0) v.splice(idx, 1);
                        }
                        value = v;
                        onChange?.();
                    }}
                />
                <span class="text-sm text-gray-800">{v}</span>
            </label>
        {/each}
    </div>
</div>
{/if}
{#if type=="checkbox"}
<div>
    <label class="block text-xs font-medium text-gray-700 mt-1 ml-1 mb-[-.1em]">{label}</label>
    <span class="flex items-center p-2">
        <input class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            type="checkbox" name={name} bind:checked={value} />
        <span class="ml-2 text-sm text-gray-900">{label}</span>
    </span>
</div>
{/if}
