<script lang="ts">
	import DataTable from './DataTable.svelte';

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
		fetchEndpoint: string; // API endpoint to fetch all items (with pagination)
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
		fetchEndpoint,
		columns,
		placeholder = 'Click to select...',
		label = '',
		disabled = false,
		title = 'Select Item',
		onSelect
	}: Props = $props();

	let showModal = $state(false);
	let items = $state<LookupItem[]>([]);
	let isLoading = $state(false);
	let searchQuery = $state('');
	let currentPage = $state(1);
	let pageSize = $state(10);
	let totalItems = $state(0);

	// Fetch items when modal opens
	async function fetchItems() {
		isLoading = true;
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				pageSize: pageSize.toString()
			});

			if (searchQuery) {
				params.set('search', searchQuery);
			}

			// Check if fetchEndpoint already has query parameters
			const separator = fetchEndpoint.includes('?') ? '&' : '?';
			const url = `${fetchEndpoint}${separator}${params}`;

			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();
				items = data.items || data;
				totalItems = data.total || items.length;
			}
		} catch (err) {
			console.error('Lookup fetch error:', err);
		} finally {
			isLoading = false;
		}
	}

	function openModal() {
		if (disabled) return;
		showModal = true;
		currentPage = 1;
		searchQuery = '';
		fetchItems();
	}

	function closeModal() {
		showModal = false;
		items = [];
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
		await fetchItems();
	}

	async function handlePageSizeChange(size: number) {
		pageSize = size;
		currentPage = 1;
		await fetchItems();
	}

	async function handleSearch(query: string) {
		searchQuery = query;
		currentPage = 1;
		await fetchItems();
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
			<button type="button" onclick={openModal} class="text-gray-400" disabled={disabled}>
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
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={closeModal}
	>
		<div
			class="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">{title}</h3>
				<button
					onclick={closeModal}
					class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
				>
					×
				</button>
			</div>

			<!-- Modal Content (DataTable) -->
			<div class="flex-1 overflow-auto p-6">
				{#if isLoading && items.length === 0}
					<div class="flex items-center justify-center py-12">
						<svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
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
				{:else}
					<DataTable
						data={items}
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

			<!-- Modal Footer -->
			<div class="px-6 py-4 border-t bg-gray-50 flex justify-end">
				<button
					onclick={closeModal}
					class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
