<script lang="ts" generics="T extends Record<string, any>">
	import type { Snippet } from 'svelte';

	interface Column<T> {
		key: keyof T | string;
		label: string;
		sortable?: boolean;
		render?: (value: any, row: T) => string;
		class?: string;
	}

	interface ActionButton {
		label: string;
		onClick: () => void;
		class?: string;
		icon?: string;
	}

	interface Props {
		data: T[];
		columns: Column<T>[];
		// Pagination
		page?: number;
		pageSize?: number;
		totalItems?: number;
		pageSizeOptions?: number[];
		// Search
		searchable?: boolean;
		searchPlaceholder?: string;
		searchKeys?: (keyof T)[];
		// Sorting
		sortKey?: keyof T | string;
		sortDirection?: 'asc' | 'desc';
		// Styling
		striped?: boolean;
		hoverable?: boolean;
		bordered?: boolean;
		compact?: boolean;
		// Actions
		showActions?: boolean;
		actionColumn?: Snippet<[{ row: T }]>;
		actions?: (row: T) => ActionButton[];
		exportable?: boolean;
		// Loading & Empty
		loading?: boolean;
		emptyMessage?: string;
		// Event callbacks (Svelte 5 style)
		onPageChange?: (page: number) => void;
		onPageSizeChange?: (pageSize: number) => void;
		onSort?: (event: { key: keyof T | string; direction: 'asc' | 'desc' }) => void;
		onSearch?: (query: string) => void;
		onEdit?: (row: T) => void;
		onDelete?: (row: T) => void;
	}

	let {
		data = [],
		columns,
		page = 1,
		pageSize = 10,
		totalItems = 0,
		pageSizeOptions = [10, 25, 50, 100],
		searchable = true,
		searchPlaceholder = 'Cari...',
		searchKeys = [],
		sortKey = $bindable(''),
		sortDirection = $bindable('asc'),
		striped = true,
		hoverable = true,
		bordered = false,
		compact = false,
		showActions = false,
		actionColumn,
		actions,
		exportable = false,
		loading = false,
		emptyMessage = 'Tidak ada data',
		onPageChange,
		onPageSizeChange,
		onSort,
		onSearch,
		onEdit,
		onDelete
	}: Props = $props();

	// Determine if we should show actions column
	const hasActions = $derived(
		showActions || !!actionColumn || !!actions || !!onEdit || !!onDelete
	);

	let searchQuery = $state('');
	let currentPage = $state(page);
	let currentPageSize = $state(pageSize);

	// Filtered and sorted data
	const filteredData = $derived(() => {
		let result = [...data];

		// Search filter
		if (searchQuery && searchKeys.length > 0) {
			const query = searchQuery.toLowerCase();
			result = result.filter((item) =>
				searchKeys.some((key) => {
					const value = item[key];
					return value?.toString().toLowerCase().includes(query);
				})
			);
		}

		// Client-side sorting (if not server-side)
		if (sortKey && totalItems === 0) {
			result.sort((a, b) => {
				const aVal = a[sortKey];
				const bVal = b[sortKey];

				if (aVal === bVal) return 0;

				const comparison = aVal > bVal ? 1 : -1;
				return sortDirection === 'asc' ? comparison : -comparison;
			});
		}

		return result;
	});

	// Paginated data (client-side pagination if totalItems not provided)
	const paginatedData = $derived(() => {
		if (totalItems > 0) {
			// Server-side pagination
			return filteredData();
		} else {
			// Client-side pagination
			const start = (currentPage - 1) * currentPageSize;
			const end = start + currentPageSize;
			return filteredData().slice(start, end);
		}
	});

	const totalPages = $derived(
		totalItems > 0
			? Math.ceil(totalItems / currentPageSize)
			: Math.ceil(filteredData().length / currentPageSize)
	);

	const totalFilteredItems = $derived(
		totalItems > 0 ? totalItems : filteredData().length
	);

	// Pagination info
	const startItem = $derived((currentPage - 1) * currentPageSize + 1);
	const endItem = $derived(Math.min(currentPage * currentPageSize, totalFilteredItems));

	// Functions
	function handleSort(column: Column<T>) {
		if (!column.sortable) return;

		const key = column.key as keyof T | string;
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}

		onSort?.({ key, direction: sortDirection });
	}

	function goToPage(newPage: number) {
		if (newPage < 1 || newPage > totalPages) return;
		currentPage = newPage;
		onPageChange?.(newPage);
	}

	function changePageSize(newSize: number) {
		currentPageSize = newSize;
		currentPage = 1; // Reset to first page
		onPageSizeChange?.(newSize);
	}

	function handleSearchInput() {
		currentPage = 1; // Reset to first page on search
		onSearch?.(searchQuery);
	}

	function getCellValue(row: T, column: Column<T>) {
		const value = row[column.key as keyof T];
		if (column.render) {
			return column.render(value, row);
		}
		return value?.toString() || '-';
	}

	// Sync props with internal state
	$effect(() => {
		currentPage = page;
	});

	$effect(() => {
		currentPageSize = pageSize;
	});
</script>

<div class="datatable-container">
	<!-- Search Bar -->
	{#if searchable}
		<div class="mb-4 flex gap-4 items-center">
			<div class="flex-1 relative">
				<input
					type="text"
					bind:value={searchQuery}
					oninput={handleSearchInput}
					placeholder={searchPlaceholder}
					class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
				/>
				<svg
					class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</div>
			<div class="flex items-center gap-2 text-sm text-gray-600">
				<span>Tampilkan:</span>
				<select
					bind:value={currentPageSize}
					onchange={() => changePageSize(currentPageSize)}
					class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
				>
					{#each pageSizeOptions as size}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

	<!-- Table -->
	<div class="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
		<table
			class="w-full text-sm text-left"
			class:striped
			class:hoverable
			class:bordered
			class:compact
		>
			<thead class="bg-gray-50 border-b border-gray-200">
				<tr>
					{#each columns as column}
						<th
							class="px-4 py-3 font-semibold text-gray-700 {column.class || ''}"
							class:cursor-pointer={column.sortable}
							class:select-none={column.sortable}
							onclick={() => handleSort(column)}
						>
							<div class="flex items-center gap-2">
								<span>{column.label}</span>
								{#if column.sortable}
									<span class="text-gray-400">
										{#if sortKey === column.key}
											{#if sortDirection === 'asc'}
												↑
											{:else}
												↓
											{/if}
										{:else}
											↕
										{/if}
									</span>
								{/if}
							</div>
						</th>
					{/each}
					{#if hasActions}
						<th class="px-4 py-3 font-semibold text-gray-700 text-right">Aksi</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan={columns.length + (hasActions ? 1 : 0)} class="px-4 py-8 text-center">
							<div class="flex items-center justify-center gap-2 text-gray-500">
								<svg
									class="animate-spin h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
								>
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
								<span>Memuat data...</span>
							</div>
						</td>
					</tr>
				{:else if paginatedData().length === 0}
					<tr>
						<td colspan={columns.length + (hasActions ? 1 : 0)} class="px-4 py-8 text-center">
							<div class="text-gray-500">
								<svg
									class="mx-auto h-12 w-12 text-gray-400 mb-2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
									/>
								</svg>
								<p class="font-medium">{emptyMessage}</p>
							</div>
						</td>
					</tr>
				{:else}
					{#each paginatedData() as row, i (i)}
						<tr>
							{#each columns as column}
								<td class="px-4 py-3 {column.class || ''}">
									{@html getCellValue(row, column)}
								</td>
							{/each}
							{#if hasActions}
								<td class="px-4 py-3 text-right">
									<div class="flex justify-end gap-2">
										{#if actionColumn}
											{@render actionColumn({ row })}
										{:else if actions}
											{#each actions(row) as action}
												<button
													type="button"
													onclick={action.onClick}
													class="text-sm font-medium {action.class || 'text-indigo-600 hover:text-indigo-900'}"
												>
													{#if action.icon}
														<span class="mr-1">{action.icon}</span>
													{/if}
													{action.label}
												</button>
											{/each}
										{:else}
											{#if onEdit}
												<button
													type="button"
													onclick={() => onEdit?.(row)}
													class="text-indigo-600 hover:text-indigo-900"
													title="Edit"
												>
													<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
													</svg>
												</button>
											{/if}
											{#if onDelete}
												<button
													type="button"
													onclick={() => onDelete?.(row)}
													class="text-red-600 hover:text-red-900"
													title="Delete"
												>
													<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
												</button>
											{/if}
										{/if}
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if !loading && paginatedData().length > 0}
		<div class="mt-4 flex items-center justify-between text-sm">
			<div class="text-gray-600">
				Menampilkan <span class="font-semibold">{startItem}</span> -
				<span class="font-semibold">{endItem}</span> dari
				<span class="font-semibold">{totalFilteredItems}</span> data
			</div>

			<div class="flex items-center gap-2">
				<button
					onclick={() => goToPage(1)}
					disabled={currentPage === 1}
					class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					title="Halaman pertama"
				>
					«
				</button>
				<button
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage === 1}
					class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					‹
				</button>

				{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
					const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
					return start + i;
				}) as pageNum}
					{#if pageNum <= totalPages}
						<button
							onclick={() => goToPage(pageNum)}
							class="px-3 py-2 border rounded-lg"
							class:bg-indigo-600={currentPage === pageNum}
							class:text-white={currentPage === pageNum}
							class:border-indigo-600={currentPage === pageNum}
							class:border-gray-300={currentPage !== pageNum}
							class:hover:bg-gray-50={currentPage !== pageNum}
						>
							{pageNum}
						</button>
					{/if}
				{/each}

				<button
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage === totalPages}
					class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					›
				</button>
				<button
					onclick={() => goToPage(totalPages)}
					disabled={currentPage === totalPages}
					class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					title="Halaman terakhir"
				>
					»
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	table.striped tbody tr:nth-child(even) {
		background-color: #f9fafb;
	}

	table.hoverable tbody tr:hover {
		background-color: #f3f4f6;
	}

	table.bordered th,
	table.bordered td {
		border: 1px solid #e5e7eb;
	}

	table.compact th,
	table.compact td {
		padding: 0.5rem 1rem;
	}
</style>
