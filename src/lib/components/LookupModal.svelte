<script lang="ts">
	import FormModal from './FormModal.svelte';
	import DataTable from './DataTable.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'ui:lookup-modal' });

	interface LookupItem {
		_id: string;
		[key: string]: any;
	}

	interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		render?: (value: any, row: LookupItem) => string;
	}

	interface Props {
		value: string | null; // Selected ID
		displayValue?: string; // Display text for selected item
		fetchEndpoint?: string; // API endpoint (mutually exclusive with localItems)
		localItems?: LookupItem[]; // Local data source (no API call needed)
		columns: Column[]; // DataTable columns
		placeholder?: string;
		label?: string;
		disabled?: boolean;
		title?: string; // Modal title
		onSelect: (item: LookupItem | null) => void;
	}

	let {
		value = $bindable(null),
		displayValue = '',
		fetchEndpoint = '',
		localItems,
		columns,
		placeholder = 'Click to select...',
		label = '',
		disabled = false,
		title = 'Select Item',
		onSelect
	}: Props = $props();

	let showModal = $state(false);
	let fetchedItems = $state<LookupItem[]>([]);
	let isLoading = $state(false);
	let searchQuery = $state('');
	let currentPage = $state(1);
	let pageSize = $state(10);
	let totalFetched = $state(0);

	// Local filtering + pagination when localItems provided
	const filteredLocal = $derived.by(() => {
		if (!localItems) return [];
		const q = searchQuery.toLowerCase();
		if (!q) return localItems;
		return localItems.filter(item =>
			Object.values(item).some(v => String(v ?? '').toLowerCase().includes(q))
		);
	});

	const displayItems = $derived.by(() => {
		if (localItems) {
			const start = (currentPage - 1) * pageSize;
			return filteredLocal.slice(start, start + pageSize);
		}
		return fetchedItems;
	});

	const totalItems = $derived(localItems ? filteredLocal.length : totalFetched);

	// Fetch items from API
	async function fetchItems() {
		isLoading = true;
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				pageSize: pageSize.toString()
			});
			if (searchQuery) params.set('search', searchQuery);
			const separator = fetchEndpoint.includes('?') ? '&' : '?';
			const response = await fetch(`${fetchEndpoint}${separator}${params}`);
			if (response.ok) {
				const data = await response.json();
				fetchedItems = data.items || data;
				totalFetched = data.total || fetchedItems.length;
			}
		} catch (err) {
			log.error('Lookup fetch error', { error: err });
		} finally {
			isLoading = false;
		}
	}

	function openModal() {
		if (disabled) return;
		showModal = true;
		currentPage = 1;
		searchQuery = '';
		if (!localItems) fetchItems();
	}

	function closeModal() {
		showModal = false;
		if (!localItems) fetchedItems = [];
	}

	function selectItem(item: LookupItem) {
		value = item._id;
		onSelect(item);
		closeModal();
	}

	function clearSelection() {
		value = null;
		onSelect(null);
	}

	async function handlePageChange(page: number) {
		currentPage = page;
		if (!localItems) await fetchItems();
	}

	async function handlePageSizeChange(size: number) {
		pageSize = size;
		currentPage = 1;
		if (!localItems) await fetchItems();
	}

	async function handleSearch(query: string) {
		searchQuery = query;
		currentPage = 1;
		if (!localItems) await fetchItems();
	}
</script>

<div class="lookup-modal-container">
	{#if label}
		<label class="block text-sm font-medium text-gray-700 mb-1">
			{label}
		</label>
	{/if}

	<div class="relative">
		<!-- Display Input (read-only, click to open modal) -->
		<input
			type="text"
			value={displayValue || ''}
			onclick={openModal}
			readonly
			{placeholder}
			{disabled}
			aria-label={label || placeholder}
			class="w-full px-3 py-2 pr-10 border rounded-md cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none"
			class:opacity-50={disabled}
			class:cursor-not-allowed={disabled}
		/>

		<!-- Icons -->
		<div class="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
			{#if value && displayValue}
				<button
					type="button"
					onclick={clearSelection}
					class="text-gray-400 hover:text-gray-600"
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
			<button type="button" onclick={openModal} class="text-gray-400" disabled={disabled} aria-label="Open lookup">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>

<!-- Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<FormModal
		onClose={closeModal}
		title={title}
		nested
		wide>
		<!-- Modal Content (DataTable) -->
		<div class="flex-1 overflow-auto p-6">
			{#if isLoading && displayItems.length === 0}
				<div class="flex items-center justify-center py-12">
					<svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25"
							cx="12" cy="12" r="10"
							stroke="currentColor"
							stroke-width="4" />
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
				</div>
			{:else}
				<DataTable
					data={displayItems}
					{columns}
					page={currentPage}
					pageSize={pageSize}
					totalItems={totalItems}
					searchable={true}
					searchPlaceholder="Search..."
					onPageChange={handlePageChange}
					onPageSizeChange={handlePageSizeChange}
					onSearch={handleSearch}
					onRowClick={selectItem}
					emptyMessage="No items found"
				/>
			{/if}
		</div>			
	</FormModal>
{/if}
