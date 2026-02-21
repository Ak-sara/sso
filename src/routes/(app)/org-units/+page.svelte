<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import LookupModal from '$lib/components/LookupModal.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	// Modal state
	let showEditModal = $state(false);
	let selectedUnit: any = $state(null);

	// Parent Unit Lookup Columns
	const parentUnitColumns = [
		{
			key: 'code',
			label: 'Code',
			sortable: true
		},
		{
			key: 'name',
			label: 'Name',
			sortable: true
		},
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			render: (value: string) => `<span class="capitalize">${value}</span>`
		},
		{
			key: 'level',
			label: 'Level',
			sortable: true,
			render: (value: number) => `Level ${value}`
		}
	];

	// Manager Lookup Columns
	const managerColumns = [
		{
			key: 'employeeId',
			label: 'Employee ID',
			sortable: true
		},
		{
			key: 'fullName',
			label: 'Name',
			sortable: true
		},
		{
			key: 'positionName',
			label: 'Position',
			sortable: false
		},
		{
			key: 'orgUnitName',
			label: 'Org Unit',
			sortable: false
		}
	];

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

	async function handleEdit(unit: any) {
		try {
			// Fetch full unit data from API
			const response = await fetch(`/api/org-units/${unit.code}`);
			if (response.ok) {
				selectedUnit = await response.json();
				showEditModal = true;
			} else {
				alert('Failed to load unit data');
			}
		} catch (err) {
			console.error('Error loading unit:', err);
			alert('Failed to load unit data');
		}
	}

	function handleCreate() {
		goto('/org-units/new');
	}

	// Close modal
	function closeEditModal() {
		showEditModal = false;
		selectedUnit = null;
	}

	// Save changes
	async function saveChanges() {
		if (!selectedUnit) return;

		try {
			const updateData = {
				name: selectedUnit.name,
				shortName: selectedUnit.shortName || '',
				type: selectedUnit.type,
				description: selectedUnit.description || '',
				organizationId: selectedUnit.organizationId,
				parentId: selectedUnit.parentId || null,
				managerId: selectedUnit.managerId || null,
				level: selectedUnit.level || 0,
				sortOrder: selectedUnit.sortOrder || 0,
				isActive: selectedUnit.isActive
			};

			const response = await fetch(`/api/org-units/${selectedUnit.code}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				alert('Changes saved successfully');
				closeEditModal();
				await invalidateAll(); // Reload data
			} else {
				const error = await response.json();
				alert(`Failed to save changes: ${error.message || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('Error saving changes:', err);
			alert('Failed to save changes');
		}
	}

	async function handleDelete(unit: any) {
		if (
			!confirm(
				`Apakah Anda yakin ingin menghapus unit "${unit.name}"? Tindakan ini tidak dapat dibatalkan.`
			)
		) {
			return;
		}

		try {
			const formData = new FormData();
			formData.append('unitId', unit._id);

			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				alert(`Gagal menghapus unit: ${result.data.error}`);
			} else if (result.type === 'success') {
				alert('Unit berhasil dihapus');
				await invalidateAll();
			}
		} catch (err) {
			console.error('Error deleting unit:', err);
			alert('Gagal menghapus unit');
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
		<button
			type="button"
			onclick={handleCreate}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
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
		searchPlaceholder="Cari unit kerja (nama, kode)..."
		onPageChange={handlePageChange}
		onPageSizeChange={handlePageSizeChange}
		onSort={handleSort}
		onSearch={handleSearch}
		onEdit={handleEdit}
		onDelete={handleDelete}
		emptyMessage="Belum ada unit kerja. Tambahkan unit kerja baru untuk memulai."
	/>
</div>

<!-- Edit Unit Modal -->
{#if showEditModal && selectedUnit}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={closeEditModal}
	>
		<div
			class="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
				<div>
					<h3 class="text-xl font-bold">{selectedUnit.name}</h3>
					<p class="text-sm text-gray-500">Kode: {selectedUnit.code}</p>
				</div>
				<button
					onclick={closeEditModal}
					class="text-gray-400 hover:text-gray-600 text-2xl"
				>
					×
				</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-4">
				<!-- Name & Short Name (side by side) -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nama Unit</label>
						<input
							type="text"
							bind:value={selectedUnit.name}
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nama Singkat</label>
						<input
							type="text"
							bind:value={selectedUnit.shortName}
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							placeholder="Opsional"
						/>
					</div>
				</div>

				<!-- Code (read-only) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Kode Unit</label>
					<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{selectedUnit.code}</p>
					<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah</p>
				</div>

				<!-- Type (1 column) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Tipe Unit</label>
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
				</div>

				<!-- Level & Sort Order (2 columns, read-only) -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
						<input
							type="number"
							bind:value={selectedUnit.level}
							readonly
							class="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
							title="Auto-calculated from hierarchy"
						/>
						<p class="text-xs text-gray-500 mt-1">Auto-calculated</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
						<input
							type="number"
							bind:value={selectedUnit.sortOrder}
							readonly
							class="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
							title="Auto-calculated"
						/>
						<p class="text-xs text-gray-500 mt-1">Auto-calculated</p>
					</div>
				</div>

				<!-- Description -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
					<textarea
						bind:value={selectedUnit.description}
						rows="3"
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					></textarea>
				</div>

				<!-- Organization (dropdown) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Organisasi</label>
					<select
						bind:value={selectedUnit.organizationId}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					>
						{#each data.organizationOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- Parent Unit (Lookup Modal) -->
				<LookupModal
					bind:value={selectedUnit.parentId}
					displayValue={selectedUnit.parentName || ''}
					fetchEndpoint="/api/org-units/search?organizationId={selectedUnit.organizationId}&currentUnitId={selectedUnit._id}"
					columns={parentUnitColumns}
					placeholder="Click to select parent unit..."
					label="Parent Unit"
					title="Select Parent Unit"
					onSelect={(item) => {
						if (item) {
							selectedUnit.parentId = item._id;
							selectedUnit.parentName = `${item.code} - ${item.name}`;
						} else {
							selectedUnit.parentId = null;
							selectedUnit.parentName = '';
						}
					}}
				/>

				<!-- Manager (Lookup Modal) -->
				<LookupModal
					bind:value={selectedUnit.managerId}
					displayValue={selectedUnit.managerName || ''}
					fetchEndpoint="/api/identities/search?identityType=employee"
					columns={managerColumns}
					placeholder="Click to select manager..."
					label="Manager (Unit Head)"
					title="Select Manager"
					onSelect={(item) => {
						if (item) {
							selectedUnit.managerId = item._id;
							selectedUnit.managerName = `${item.employeeId} - ${item.fullName}`;
						} else {
							selectedUnit.managerId = null;
							selectedUnit.managerName = '';
						}
					}}
				/>

				<!-- Active Status -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={selectedUnit.isActive}
							class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						/>
						<span class="text-sm">Unit Aktif</span>
					</label>
				</div>
			</div>

			<!-- Footer -->
			<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
				<button
					onclick={closeEditModal}
					class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					onclick={saveChanges}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					💾 Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}
