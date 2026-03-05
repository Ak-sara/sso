<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedPosition: any = $state(null);

	// DataTable columns
	const columns = [
		{
			key: 'name',
			label: 'Position Name',
			sortable: true,
			render: (value: string, row: any) => `
				<div>
					<p class="font-medium text-gray-900">${value}</p>
					<p class="text-sm text-gray-500">Code: ${row.code}</p>
				</div>
			`
		},
		{
			key: 'grade',
			label: 'Grade',
			sortable: true,
			render: (value: string) => value || '<span class="text-gray-400">-</span>'
		},
		{
			key: 'level',
			label: 'Level',
			sortable: true,
			render: (value: number) => `
				<span class="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
					${value}
				</span>
			`
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

	async function handleEdit(position: any) {
		try {
			const response = await fetch(`/api/positions/${position.code}`);
			if (response.ok) {
				selectedPosition = await response.json();
				showEditModal = true;
			} else {
				alert('Failed to load position data');
			}
		} catch (err) {
			console.error('Error loading position:', err);
			alert('Failed to load position data');
		}
	}

	async function handleDelete(position: any) {
		if (!confirm(`Delete position "${position.name}"? This action cannot be undone.`)) {
			return;
		}

		try {
			const formData = new FormData();
			formData.append('code', position.code);

			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				alert(`Failed to delete position: ${result.data.error}`);
			} else if (result.type === 'success') {
				alert('Position deleted successfully');
				await invalidateAll();
			}
		} catch (err) {
			console.error('Error deleting position:', err);
			alert('Failed to delete position');
		}
	}

	async function saveChanges() {
		if (!selectedPosition) return;

		try {
			const updateData = {
				name: selectedPosition.name,
				grade: selectedPosition.grade || '',
				level: selectedPosition.level || 0,
				description: selectedPosition.description || '',
				isActive: selectedPosition.isActive
			};

			const response = await fetch(`/api/positions/${selectedPosition.code}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				alert('Position updated successfully');
				closeEditModal();
				await invalidateAll();
			} else {
				const error = await response.json();
				alert(`Failed to update position: ${error.error || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('Error updating position:', err);
			alert('Failed to update position');
		}
	}

	function closeEditModal() {
		showEditModal = false;
		selectedPosition = null;
	}
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<p class="text-sm text-gray-500">Kelola data posisi/jabatan</p>
		<button
			onclick={() => (showCreateModal = true)}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
			+ Tambah Posisi
		</button>
	</div>

	{#if form?.success}
		<div class="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
			{form.success}
		</div>
	{/if}

	{#if form?.error}
		<div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
			{form.error}
		</div>
	{/if}

	<!-- Positions DataTable -->
	<DataTable
		data={data.positions}
		{columns}
		searchPlaceholder="Cari posisi (nama, kode)..."
		onEdit={handleEdit}
		onDelete={handleDelete}
		emptyMessage="Belum ada posisi. Tambahkan posisi baru untuk memulai."
	/>
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => (showCreateModal = false)} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
				<h3 class="text-lg font-medium mb-4">Tambah Posisi Baru</h3>

				<form method="POST" action="?/create" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Kode <span class="text-red-600">*</span></label>
						<input
							type="text"
							name="code"
							required
							placeholder="MGR"
							class="mt-1 block w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Nama Posisi <span class="text-red-600">*</span></label>
						<input
							type="text"
							name="name"
							required
							placeholder="Manager"
							class="mt-1 block w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Grade</label>
						<input
							type="text"
							name="grade"
							placeholder="5"
							class="mt-1 block w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Level</label>
						<input
							type="number"
							name="level"
							value="0"
							min="0"
							max="10"
							class="mt-1 block w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Deskripsi</label>
						<textarea
							name="description"
							rows="3"
							class="mt-1 block w-full px-3 py-2 border rounded-md"
						></textarea>
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onclick={() => (showCreateModal = false)}
							class="px-4 py-2 border rounded-md"
						>
							Batal
						</button>
						<button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
							Buat Posisi
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && selectedPosition}
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
					<h3 class="text-xl font-bold">{selectedPosition.name}</h3>
					<p class="text-sm text-gray-500">Code: {selectedPosition.code}</p>
				</div>
				<button onclick={closeEditModal} class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-4">
				<!-- Code (read-only) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Kode</label>
					<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{selectedPosition.code}</p>
					<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah</p>
				</div>

				<!-- Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nama Posisi</label>
					<input
						type="text"
						bind:value={selectedPosition.name}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Grade -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Grade</label>
					<input
						type="text"
						bind:value={selectedPosition.grade}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Level -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
					<input
						type="number"
						bind:value={selectedPosition.level}
						min="0"
						max="10"
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Description -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
					<textarea
						bind:value={selectedPosition.description}
						rows="3"
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					></textarea>
				</div>

				<!-- Active Status -->
				<div>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={selectedPosition.isActive}
							class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						/>
						<span class="text-sm font-medium text-gray-700">Position Active</span>
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
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}
