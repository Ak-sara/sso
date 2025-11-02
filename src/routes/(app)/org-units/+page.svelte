<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	// Modal state
	let showModal = $state(false);
	let selectedUnit = $state<any>(null);
	let isEditing = $state(false);
	let parentOptions = $state<Array<{ value: string; label: string }>>([]);
	let isLoadingOptions = $state(false);

	const getTypeIcon = (type: string) => {
		const icons: Record<string, string> = {
			board: '🏛️',
			directorate: '👔',
			division: '📁',
			department: '📂',
			section: '📄',
			sbu: '🏢',
			team: '👥'
		};
		return icons[type] || '📋';
	};

	const columns = [
		{
			key: 'name',
			label: 'Unit Kerja',
			sortable: true,
			render: (value: string, row: any) => `
				<div class="flex items-center">
					<span class="text-xl mr-2">${getTypeIcon(row.type)}</span>
					<div>
						<div class="text-sm font-medium text-gray-900" style="margin-left: ${row.level * 20}px">
							${value}
						</div>
						${row.shortName ? `<div class="text-xs text-gray-500">${row.shortName}</div>` : ''}
					</div>
				</div>
			`
		},
		{
			key: 'code',
			label: 'Kode',
			sortable: true,
			render: (value: string) => `<code class="bg-gray-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{
			key: 'type',
			label: 'Tipe',
			sortable: true,
			render: (value: string) =>
				`<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${value}</span>`
		},
		{
			key: 'level',
			label: 'Level',
			sortable: true,
			render: (value: number) => `Level ${value}`
		},
		{
			key: 'isActive',
			label: 'Status',
			sortable: true,
			render: (value: boolean) => {
				const colorClass = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
				const label = value ? 'Aktif' : 'Nonaktif';
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${colorClass}">${label}</span>`;
			}
		}
	];

	function handlePageChange(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handlePageSizeChange(newPageSize: number) {
		const url = new URL($page.url);
		url.searchParams.set('pageSize', newPageSize.toString());
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSort(event: { key: string; direction: 'asc' | 'desc' }) {
		const url = new URL($page.url);
		url.searchParams.set('sortKey', event.key);
		url.searchParams.set('sortDirection', event.direction);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearch(query: string) {
		const url = new URL($page.url);
		if (query) {
			url.searchParams.set('search', query);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	// Open detail modal (view only)
	function openDetail(unit: any) {
		selectedUnit = { ...unit };
		isEditing = false;
		showModal = true;
	}

	// Open edit modal
	async function openEdit(unit: any) {
		selectedUnit = { ...unit };
		// Convert null parentId to empty string for select binding
		if (selectedUnit.parentId === null || selectedUnit.parentId === undefined) {
			selectedUnit.parentId = '';
		}

		isEditing = true;
		isLoadingOptions = true;

		console.log('Opening edit for unit:', selectedUnit.code, 'parentId:', selectedUnit.parentId, 'org:', selectedUnit.organizationId);

		// Fetch parent options BEFORE showing modal
		await loadParentOptions(unit._id, unit.organizationId);

		isLoadingOptions = false;
		showModal = true;
	}

	// Load parent options from API
	async function loadParentOptions(currentUnitId?: string, organizationId?: string) {
		try {
			const params = new URLSearchParams();
			if (currentUnitId) params.set('currentUnitId', currentUnitId);
			if (organizationId) params.set('organizationId', organizationId);

			const url = `/api/org-units/parent-options?${params}`;
			console.log('Fetching parent options from:', url);

			const response = await fetch(url);
			console.log('Response status:', response.status, 'OK:', response.ok);

			if (response.ok) {
				const options = await response.json();
				console.log('✅ Loaded parent options:', options.length, 'items');
				console.log('First 3 options:', options.slice(0, 3));
				parentOptions = options;
			} else {
				console.error('❌ Failed to fetch parent options:', response.status);
				parentOptions = [];
			}
		} catch (err) {
			console.error('❌ Exception loading parent options:', err);
			parentOptions = [];
		}
	}

	// Close modal
	function closeModal() {
		showModal = false;
		selectedUnit = null;
		isEditing = false;
	}

	// Save changes
	async function saveUnit() {
		if (!selectedUnit) return;

		try {
			const response = await fetch(`/api/org-units/${selectedUnit.code}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(selectedUnit)
			});

			if (!response.ok) {
				throw new Error('Failed to save unit');
			}

			alert('Unit berhasil disimpan');
			closeModal();
			// Reload page to refresh data
			window.location.reload();
		} catch (err) {
			console.error('Save error:', err);
			alert('Gagal menyimpan unit');
		}
	}

	// Delete unit
	async function deleteUnit(unit: any) {
		if (!confirm(`Apakah Anda yakin ingin menghapus unit "${unit.name}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/org-units/${unit.code}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to delete unit');
			}

			alert('Unit berhasil dihapus');
			// Reload page to refresh data
			window.location.reload();
		} catch (err) {
			console.error('Delete error:', err);
			alert('Gagal menghapus unit: ' + (err instanceof Error ? err.message : String(err)));
		}
	}
</script>

<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang Unit Kerja/Divisi</h3>
				<p class="mt-1 text-sm text-blue-700">
					Unit kerja adalah bagian dari struktur organisasi seperti Direktorat, Divisi, Departemen, Seksi, dll.
					Setiap unit memiliki hierarki dan dapat memiliki unit parent. Unit ini digunakan untuk penempatan
					karyawan dan pelaporan struktur organisasi.
				</p>
			</div>
		</div>
	</div>

	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola unit kerja dalam organisasi</p>
		</div>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
			+ Tambah Unit Kerja
		</button>
	</div>

	<!-- Org Units DataTable -->
	<DataTable
		data={data.orgUnits}
		{columns}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		showActions={true}
		searchPlaceholder="Cari unit kerja (nama, kode)..."
		onPageChange={handlePageChange}
		onPageSizeChange={handlePageSizeChange}
		onSort={handleSort}
		onSearch={handleSearch}
		emptyMessage="Belum ada unit kerja. Tambahkan unit kerja baru untuk memulai."
	>
		{#snippet actionColumn({ row })}
			<button onclick={() => openEdit(row)} class="text-indigo-600 hover:text-indigo-900 mr-3 font-medium">Edit</button>
			<button onclick={() => openDetail(row)} class="text-blue-600 hover:text-blue-900 mr-3 font-medium">Detail</button>
			<button onclick={() => deleteUnit(row)} class="text-red-600 hover:text-red-900 font-medium">Delete</button>
		{/snippet}
	</DataTable>
</div>

<!-- Unit Detail/Edit Modal -->
{#if showModal && selectedUnit}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onclick={closeModal}>
		<div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
				<div>
					<h3 class="text-xl font-bold">{selectedUnit.name}</h3>
					<p class="text-sm text-gray-500">Kode: {selectedUnit.code}</p>
				</div>
				<div class="flex items-center gap-2">
					{#if !isEditing}
						<span class="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
							VIEW ONLY
						</span>
					{/if}
					<button onclick={closeModal} class="text-gray-400 hover:text-gray-600 text-2xl">
						×
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-4">
				<!-- Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nama Unit</label>
					{#if isEditing}
						<input
							type="text"
							bind:value={selectedUnit.name}
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						/>
					{:else}
						<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedUnit.name}</p>
					{/if}
				</div>

				<!-- Short Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nama Singkat</label>
					{#if isEditing}
						<input
							type="text"
							bind:value={selectedUnit.shortName}
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						/>
					{:else}
						<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedUnit.shortName || '-'}</p>
					{/if}
				</div>

				<!-- Code -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Kode Unit</label>
					<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{selectedUnit.code}</p>
					<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah</p>
				</div>

				<!-- Organization -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Organisasi</label>
					{#if isEditing}
						<select
							bind:value={selectedUnit.organizationId}
							onchange={() => loadParentOptions(selectedUnit._id, selectedUnit.organizationId)}
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						>
							{#each data.organizationOptions as org}
								<option value={org.value}>{org.label}</option>
							{/each}
						</select>
					{:else}
						<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedUnit.organizationId || '-'}</p>
					{/if}
				</div>

				<!-- Parent Unit -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Parent Unit</label>
					{#if isEditing}
						<select
							bind:value={selectedUnit.parentId}
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							size="1"
						>
							{#each parentOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
						<div class="mt-1 text-xs">
							<span class="text-gray-500">
								📊 Total options loaded: <strong>{parentOptions.length}</strong>
							</span>
							<br />
							<span class="text-blue-600">
								Selected: <strong>{selectedUnit.parentId || '(none - top level)'}</strong>
							</span>
						</div>
					{:else}
						<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedUnit.parentName || 'No Parent (Top Level)'}</p>
					{/if}
				</div>

				<!-- Type -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Tipe Unit</label>
					{#if isEditing}
						<select
							bind:value={selectedUnit.type}
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						>
							<option value="board">Board</option>
							<option value="directorate">Directorate</option>
							<option value="division">Division</option>
							<option value="department">Department</option>
							<option value="section">Section</option>
							<option value="team">Team</option>
							<option value="sbu">SBU</option>
						</select>
					{:else}
						<p class="px-3 py-2 bg-gray-50 rounded-md capitalize">{selectedUnit.type}</p>
					{/if}
				</div>

				<!-- Description -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
					{#if isEditing}
						<textarea
							bind:value={selectedUnit.description}
							rows="3"
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						></textarea>
					{:else}
						<p class="px-3 py-2 bg-gray-50 rounded-md">{selectedUnit.description || '-'}</p>
					{/if}
				</div>

				<!-- Level -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
					<p class="px-3 py-2 bg-gray-50 rounded-md">Level {selectedUnit.level}</p>
				</div>

				<!-- Active Status -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
					{#if isEditing}
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={selectedUnit.isActive}
								class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
							/>
							<span class="text-sm">Unit Aktif</span>
						</label>
					{:else}
						<p class="px-3 py-2 bg-gray-50 rounded-md">
							{selectedUnit.isActive ? '✓ Aktif' : '✗ Tidak Aktif'}
						</p>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			{#if isEditing}
				<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
					<button
						onclick={closeModal}
						class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						onclick={saveUnit}
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						💾 Save Changes
					</button>
				</div>
			{:else}
				<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
					<button
						onclick={closeModal}
						class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50"
					>
						Close
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
