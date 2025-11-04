<script lang="ts">
	import { onMount } from 'svelte';

	interface LookupItem {
		_id: string;
		[key: string]: any;
	}

	interface Props {
		value: string | null; // Selected ID
		displayValue?: string; // Display text for selected item
		searchEndpoint: string; // API endpoint for search
		placeholder?: string;
		label?: string;
		disabled?: boolean;
		renderItem?: (item: LookupItem) => string; // Custom item renderer
		onSelect: (item: LookupItem | null) => void;
	}

	let {
		value = $bindable(null),
		displayValue = '',
		searchEndpoint,
		placeholder = 'Search...',
		label = '',
		disabled = false,
		renderItem,
		onSelect
	}: Props = $props();

	let searchQuery = $state('');
	let results = $state<LookupItem[]>([]);
	let isLoading = $state(false);
	let isOpen = $state(false);
	let selectedIndex = $state(-1);
	let containerRef: HTMLDivElement;
	let inputRef: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout>;

	// Watch for external value changes
	$effect(() => {
		if (!value) {
			searchQuery = '';
		} else if (displayValue) {
			searchQuery = displayValue;
		}
	});

	// Debounced search
	function handleInput() {
		isLoading = true;
		clearTimeout(debounceTimer);

		if (!searchQuery || searchQuery.length < 2) {
			results = [];
			isLoading = false;
			isOpen = false;
			return;
		}

		debounceTimer = setTimeout(async () => {
			await performSearch();
		}, 300);
	}

	async function performSearch() {
		try {
			const url = `${searchEndpoint}?q=${encodeURIComponent(searchQuery)}`;
			const response = await fetch(url);

			if (response.ok) {
				results = await response.json();
				isOpen = results.length > 0;
				selectedIndex = -1;
			} else {
				results = [];
				isOpen = false;
			}
		} catch (err) {
			console.error('Lookup search error:', err);
			results = [];
			isOpen = false;
		} finally {
			isLoading = false;
		}
	}

	function selectItem(item: LookupItem | null) {
		if (item) {
			value = item._id;
			searchQuery = renderItem ? renderItem(item) : item.name || item.code || item._id;
			onSelect(item);
		} else {
			value = null;
			searchQuery = '';
			onSelect(null);
		}
		isOpen = false;
		selectedIndex = -1;
		inputRef?.blur();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen || results.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0) {
					selectItem(results[selectedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				isOpen = false;
				selectedIndex = -1;
				inputRef?.blur();
				break;
		}
	}

	function handleFocus() {
		if (results.length > 0) {
			isOpen = true;
		}
	}

	function handleBlur(e: FocusEvent) {
		// Delay to allow click events on dropdown items
		setTimeout(() => {
			if (!containerRef?.contains(document.activeElement)) {
				isOpen = false;
				selectedIndex = -1;
			}
		}, 200);
	}

	function clearSelection() {
		selectItem(null);
		inputRef?.focus();
	}

	// Click outside to close
	onMount(() => {
		function handleClickOutside(e: MouseEvent) {
			if (containerRef && !containerRef.contains(e.target as Node)) {
				isOpen = false;
				selectedIndex = -1;
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	// Default item renderer
	function defaultRenderItem(item: LookupItem): string {
		if (item.code && item.name) {
			return `${item.code} - ${item.name}`;
		}
		return item.name || item.fullName || item.code || item._id;
	}
</script>

<div bind:this={containerRef} class="lookup-container relative">
	{#if label}
		<label class="block text-sm font-medium text-gray-700 mb-1">
			{label}
		</label>
	{/if}

	<div class="relative">
		<input
			bind:this={inputRef}
			type="text"
			bind:value={searchQuery}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			{placeholder}
			{disabled}
			class="w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
			class:opacity-50={disabled}
			class:cursor-not-allowed={disabled}
			autocomplete="off"
		/>

		<!-- Loading spinner -->
		{#if isLoading}
			<div class="absolute right-3 top-1/2 -translate-y-1/2">
				<svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			</div>
		{:else if value && searchQuery}
			<!-- Clear button -->
			<button
				type="button"
				onclick={clearSelection}
				class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
				title="Clear selection"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<!-- Dropdown results -->
	{#if isOpen && !disabled}
		<div
			class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
		>
			{#if results.length === 0}
				<div class="px-4 py-3 text-sm text-gray-500">No results found</div>
			{:else}
				{#each results as item, i}
					<button
						type="button"
						onclick={() => selectItem(item)}
						class="w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 cursor-pointer"
						class:bg-indigo-100={i === selectedIndex}
					>
						{renderItem ? renderItem(item) : defaultRenderItem(item)}
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.lookup-container {
		position: relative;
	}
</style>
