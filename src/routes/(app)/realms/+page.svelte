<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedRealm: any = $state(null);
	let newDomain = $state('');

	const getTypeIcon = (type: string) => {
		const icons: Record<string, string> = {
			parent: '🏛️',
			subsidiary: '🏢',
			branch: '📍'
		};
		return icons[type] || '📋';
	};

	// DataTable columns
	const columns = [
		{
			key: 'name',
			label: 'Realm Name',
			sortable: true,
			render: (value: string, row: any) => `
				<div class="flex items-center gap-2">
					<span class="text-2xl">${getTypeIcon(row.type)}</span>
					<div>
						<p class="font-medium text-gray-900">${value}</p>
						<p class="text-sm text-gray-500">Code: ${row.code}</p>
					</div>
				</div>
			`
		},
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			render: (value: string) => `
				<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
					${value}
				</span>
			`
		},
		{
			key: 'userCount',
			label: 'Users',
			sortable: true,
			render: (value: number) => `<span class="font-medium text-gray-900">${value || 0}</span>`
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

	async function handleEdit(realm: any) {
		try {
			const response = await fetch(`/api/realms/${realm.code}`);
			if (response.ok) {
				selectedRealm = await response.json();
				// Ensure allowedEmailDomains is an array
				if (!selectedRealm.allowedEmailDomains) {
					selectedRealm.allowedEmailDomains = [];
				}
				showEditModal = true;
			} else {
				alert('Failed to load realm data');
			}
		} catch (err) {
			console.error('Error loading realm:', err);
			alert('Failed to load realm data');
		}
	}

	function addDomain() {
		if (!newDomain.trim()) return;

		const trimmedDomain = newDomain.trim().toLowerCase();

		// Validate domain format (supports wildcards)
		// Allow: example.com, *.com, *.co.id
		const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
		if (!domainRegex.test(trimmedDomain)) {
			alert('Format domain tidak valid. Gunakan format: example.com atau *.com');
			return;
		}

		// Check for duplicates
		if (selectedRealm.allowedEmailDomains.includes(trimmedDomain)) {
			alert('Domain sudah ada dalam daftar');
			return;
		}

		selectedRealm.allowedEmailDomains = [...selectedRealm.allowedEmailDomains, trimmedDomain];
		newDomain = '';
	}

	function removeDomain(domain: string) {
		selectedRealm.allowedEmailDomains = selectedRealm.allowedEmailDomains.filter((d: string) => d !== domain);
	}

	async function handleDelete(realm: any) {
		if (!confirm(`Delete realm "${realm.name}"? This action cannot be undone.`)) {
			return;
		}

		try {
			const formData = new FormData();
			formData.append('code', realm.code);

			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				alert(`Failed to delete realm: ${result.data.error}`);
			} else if (result.type === 'success') {
				alert('Realm deleted successfully');
				await invalidateAll();
			}
		} catch (err) {
			console.error('Error deleting realm:', err);
			alert('Failed to delete realm');
		}
	}

	async function saveChanges() {
		if (!selectedRealm) return;

		try {
			const updateData = {
				name: selectedRealm.name,
				legalName: selectedRealm.legalName || selectedRealm.name,
				type: selectedRealm.type,
				description: selectedRealm.description || '',
				isActive: selectedRealm.isActive,
				allowedEmailDomains: selectedRealm.allowedEmailDomains || []
			};

			const response = await fetch(`/api/realms/${selectedRealm.code}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				alert('Realm updated successfully');
				closeEditModal();
				await invalidateAll();
			} else {
				const error = await response.json();
				alert(`Failed to update realm: ${error.error || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('Error updating realm:', err);
			alert('Failed to update realm');
		}
	}

	function closeEditModal() {
		showEditModal = false;
		selectedRealm = null;
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
				<h3 class="text-sm font-medium text-blue-800">Tentang Realm</h3>
				<p class="mt-1 text-sm text-blue-700">
					Realm adalah konsep yang mirip dengan tenant atau workspace. Setiap realm memiliki pengguna,
					organisasi, dan konfigurasi OAuth yang terisolasi. Realm di Aksara SSO menggunakan
					<strong>Organizations</strong> sebagai basis, sehingga setiap organisasi dapat dianggap sebagai realm terpisah.
				</p>
			</div>
		</div>
	</div>

	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola realm/tenant untuk multi-organisasi</p>
		</div>
		<button
			onclick={() => (showCreateModal = true)}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
		>
			+ Buat Realm Baru
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

	<!-- Realms DataTable -->
	<DataTable
		data={data.realms}
		{columns}
		searchPlaceholder="Cari realm (nama, kode)..."
		onEdit={handleEdit}
		onDelete={handleDelete}
		emptyMessage="Belum ada realm. Tambahkan realm baru untuk memulai."
	/>
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => (showCreateModal = false)} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Buat Realm Baru</h3>

				<form method="POST" action="?/create" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Nama Realm</label>
						<input
							type="text"
							name="name"
							required
							placeholder="PT Contoh Organisasi"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Kode</label>
						<input
							type="text"
							name="code"
							required
							placeholder="CONTOH"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Tipe</label>
						<select
							name="type"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						>
							<option value="subsidiary">Subsidiary</option>
							<option value="parent">Parent</option>
							<option value="branch">Branch</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Deskripsi</label>
						<textarea
							name="description"
							rows="3"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						></textarea>
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onclick={() => (showCreateModal = false)}
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							Buat Realm
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && selectedRealm}
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
				<div class="flex items-center gap-3">
					<span class="text-4xl">{getTypeIcon(selectedRealm.type)}</span>
					<div>
						<h3 class="text-xl font-bold">{selectedRealm.name}</h3>
						<p class="text-sm text-gray-500">Code: {selectedRealm.code}</p>
					</div>
				</div>
				<button onclick={closeEditModal} class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-4">
				<!-- Code (read-only) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Kode</label>
					<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{selectedRealm.code}</p>
					<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah</p>
				</div>

				<!-- Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nama Realm</label>
					<input
						type="text"
						bind:value={selectedRealm.name}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Legal Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nama Legal</label>
					<input
						type="text"
						bind:value={selectedRealm.legalName}
						placeholder={selectedRealm.name}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Type -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
					<select
						bind:value={selectedRealm.type}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					>
						<option value="subsidiary">Subsidiary</option>
						<option value="parent">Parent</option>
						<option value="branch">Branch</option>
					</select>
				</div>

				<!-- Description -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
					<textarea
						bind:value={selectedRealm.description}
						rows="3"
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					></textarea>
				</div>

				<!-- User Count (read-only) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Pengguna</label>
					<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{selectedRealm.userCount || 0} users</p>
				</div>

				<!-- Active Status -->
				<div>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={selectedRealm.isActive}
							class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						/>
						<span class="text-sm font-medium text-gray-700">Realm Active</span>
					</label>
				</div>

				<!-- Email Domain Whitelist -->
				<div class="border-t pt-4">
					<label class="block text-sm font-medium text-gray-700 mb-1">Email Domain Whitelist</label>
					<p class="text-xs text-gray-500 mb-2">
						Domain email yang diizinkan untuk pendaftaran. Kosongkan untuk <strong>mengizinkan semua domain</strong>. Tambahkan domain untuk <strong>membatasi hanya domain tertentu</strong>.
					</p>
					<p class="text-xs text-blue-600 mb-3">
						💡 Gunakan wildcard untuk izinkan semua subdomain: <code class="bg-blue-50 px-1 rounded">*.com</code>, <code class="bg-blue-50 px-1 rounded">*.co.id</code>
					</p>

					<!-- Current domains list -->
					{#if selectedRealm.allowedEmailDomains && selectedRealm.allowedEmailDomains.length > 0}
						<div class="space-y-2 mb-3">
							{#each selectedRealm.allowedEmailDomains as domain}
								<div class="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
									<span class="flex-1 text-sm text-gray-700">@{domain}</span>
									<button
										type="button"
										onclick={() => removeDomain(domain)}
										class="text-red-600 hover:text-red-800 text-sm font-medium"
									>
										✕
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<div class="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
							<p class="text-sm text-blue-800">
								ℹ️ <strong>Tidak ada domain yang dikonfigurasi.</strong> Semua domain email diizinkan untuk pendaftaran (tidak ada pembatasan).
							</p>
						</div>
					{/if}

					<!-- Add new domain input -->
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={newDomain}
							placeholder="contoh: ias.co.id atau *.com"
							class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addDomain();
								}
							}}
						/>
						<button
							type="button"
							onclick={addDomain}
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
						>
							Tambah
						</button>
					</div>
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
