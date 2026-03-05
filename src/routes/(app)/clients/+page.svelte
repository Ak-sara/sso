<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedClient: any = $state(null);

	// DataTable columns
	const columns = [
		{
			key: 'clientName',
			label: 'Client Name',
			sortable: true,
			render: (value: string, row: any) => `
				<div>
					<p class="font-medium text-gray-900">${value}</p>
					<code class="text-xs bg-gray-100 px-2 py-1 rounded">${row.clientId}</code>
				</div>
			`
		},
		{
			key: 'redirectUris',
			label: 'Redirect URIs',
			sortable: false,
			render: (value: string[]) => {
				if (!value || value.length === 0) return '<span class="text-gray-400">None</span>';
				return value
					.slice(0, 2)
					.map((uri) => `<p class="text-sm text-gray-700">• ${uri}</p>`)
					.join('') + (value.length > 2 ? `<p class="text-xs text-gray-500">+${value.length - 2} more</p>` : '');
			}
		},
		{
			key: 'allowedScopes',
			label: 'Scopes',
			sortable: false,
			render: (value: string[]) => {
				if (!value || value.length === 0) return '<span class="text-gray-400">None</span>';
				return `<div class="flex flex-wrap gap-1">${value
					.map((scope) => `<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">${scope}</span>`)
					.join('')}</div>`;
			}
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

	async function handleEdit(client: any) {
		try {
			const response = await fetch(`/api/oauth-clients/${client.clientId}`);
			if (response.ok) {
				selectedClient = await response.json();
				showEditModal = true;
			} else {
				alert('Failed to load client data');
			}
		} catch (err) {
			console.error('Error loading client:', err);
			alert('Failed to load client data');
		}
	}

	async function handleDelete(client: any) {
		if (!confirm(`Delete client "${client.clientName}"? This action cannot be undone.`)) {
			return;
		}

		try {
			const formData = new FormData();
			formData.append('clientId', client.clientId);

			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				alert(`Failed to delete client: ${result.data.error}`);
			} else if (result.type === 'success') {
				alert('Client deleted successfully');
				await invalidateAll();
			}
		} catch (err) {
			console.error('Error deleting client:', err);
			alert('Failed to delete client');
		}
	}

	async function saveChanges() {
		if (!selectedClient) return;

		try {
			const updateData = {
				clientName: selectedClient.clientName,
				redirectUris: selectedClient.redirectUris || [],
				allowedScopes: selectedClient.allowedScopes || [],
				grantTypes: selectedClient.grantTypes || [],
				isActive: selectedClient.isActive
			};

			const response = await fetch(`/api/oauth-clients/${selectedClient.clientId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				alert('Client updated successfully');
				closeEditModal();
				await invalidateAll();
			} else {
				const error = await response.json();
				alert(`Failed to update client: ${error.error || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('Error updating client:', err);
			alert('Failed to update client');
		}
	}

	function closeEditModal() {
		showEditModal = false;
		selectedClient = null;
	}

	function addRedirectUri() {
		if (!selectedClient.redirectUris) selectedClient.redirectUris = [];
		selectedClient.redirectUris = [...selectedClient.redirectUris, ''];
	}

	function removeRedirectUri(index: number) {
		selectedClient.redirectUris = selectedClient.redirectUris.filter((_: any, i: number) => i !== index);
	}

	function addScope() {
		if (!selectedClient.allowedScopes) selectedClient.allowedScopes = [];
		selectedClient.allowedScopes = [...selectedClient.allowedScopes, ''];
	}

	function removeScope(index: number) {
		selectedClient.allowedScopes = selectedClient.allowedScopes.filter((_: any, i: number) => i !== index);
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
				<h3 class="text-sm font-medium text-blue-800">Tentang OAuth Clients</h3>
				<p class="mt-1 text-sm text-blue-700">
					OAuth Client adalah aplikasi yang dapat menggunakan SSO untuk autentikasi. Setiap client memiliki
					<strong>Client ID</strong> dan <strong>Client Secret</strong> yang digunakan untuk OAuth 2.0 flow.
					Anda perlu mengkonfigurasi <code class="bg-blue-100 px-1 rounded">Redirect URIs</code> dan
					<code class="bg-blue-100 px-1 rounded">Allowed Scopes</code> untuk keamanan.
				</p>
			</div>
		</div>
	</div>

	<div class="flex justify-between items-center">
		<p class="text-sm text-gray-500">Kelola OAuth 2.0 Clients untuk integrasi aplikasi</p>
		<button
			onclick={() => (showCreateModal = true)}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
			+ Tambah Client
		</button>
	</div>

	{#if form?.success}
		<div class="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
			{form.success}
		</div>
	{/if}

	{#if form?.client}
		<div class="p-4 bg-blue-100 border border-blue-400 rounded-md">
			<h3 class="font-semibold text-blue-800">Client Berhasil Dibuat!</h3>
			<div class="mt-2 text-sm text-blue-700">
				<p><strong>Client ID:</strong> <code class="bg-blue-200 px-2 py-1 rounded">{form.client.client_id}</code></p>
				<p><strong>Client Secret:</strong> <code class="bg-blue-200 px-2 py-1 rounded">{form.client.client_secret}</code></p>
				<p class="text-red-600 mt-2">⚠️ Simpan credentials ini dengan aman. Secret tidak akan ditampilkan lagi.</p>
			</div>
		</div>
	{/if}

	<!-- OAuth Clients DataTable -->
	<DataTable
		data={data.clients}
		{columns}
		searchPlaceholder="Cari client (nama, client ID)..."
		onEdit={handleEdit}
		onDelete={handleDelete}
		emptyMessage="Belum ada OAuth client. Tambahkan client baru untuk memulai."
	/>
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => (showCreateModal = false)} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10">
				<h3 class="text-lg font-medium mb-4">Tambah OAuth Client Baru</h3>

				<form method="POST" action="?/create" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Nama Aplikasi</label>
						<input type="text" name="name" required class="mt-1 block w-full px-3 py-2 border rounded-md" />
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Redirect URIs (satu per baris)</label>
						<textarea name="redirect_uris" rows="3" required class="mt-1 block w-full px-3 py-2 border rounded-md"></textarea>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Allowed Scopes (pisahkan dengan spasi)</label>
						<input type="text" name="allowed_scopes" value="openid profile email" class="mt-1 block w-full px-3 py-2 border rounded-md" />
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button type="button" onclick={() => (showCreateModal = false)} class="px-4 py-2 border rounded-md">Batal</button>
						<button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Buat Client</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && selectedClient}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={closeEditModal}
	>
		<div
			class="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
				<div>
					<h3 class="text-xl font-bold">{selectedClient.clientName}</h3>
					<p class="text-sm text-gray-500">Client ID: {selectedClient.clientId}</p>
				</div>
				<button onclick={closeEditModal} class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-4">
				<!-- Client Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
					<input
						type="text"
						bind:value={selectedClient.clientName}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Redirect URIs -->
				<div>
					<div class="flex justify-between items-center mb-2">
						<label class="block text-sm font-medium text-gray-700">Redirect URIs</label>
						<button
							type="button"
							onclick={addRedirectUri}
							class="text-sm text-indigo-600 hover:text-indigo-800"
						>
							+ Add URI
						</button>
					</div>
					<div class="space-y-2">
						{#each selectedClient.redirectUris || [] as uri, index}
							<div class="flex gap-2">
								<input
									type="url"
									bind:value={selectedClient.redirectUris[index]}
									placeholder="https://example.com/callback"
									class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
								/>
								<button
									type="button"
									onclick={() => removeRedirectUri(index)}
									class="px-3 py-2 text-red-600 hover:text-red-800"
								>
									Remove
								</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- Allowed Scopes -->
				<div>
					<div class="flex justify-between items-center mb-2">
						<label class="block text-sm font-medium text-gray-700">Allowed Scopes</label>
						<button
							type="button"
							onclick={addScope}
							class="text-sm text-indigo-600 hover:text-indigo-800"
						>
							+ Add Scope
						</button>
					</div>
					<div class="space-y-2">
						{#each selectedClient.allowedScopes || [] as scope, index}
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={selectedClient.allowedScopes[index]}
									placeholder="openid"
									class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
								/>
								<button
									type="button"
									onclick={() => removeScope(index)}
									class="px-3 py-2 text-red-600 hover:text-red-800"
								>
									Remove
								</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- Grant Types (read-only) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Grant Types</label>
					<div class="flex flex-wrap gap-2">
						{#each selectedClient.grantTypes || [] as grantType}
							<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{grantType}</span>
						{/each}
					</div>
					<p class="text-xs text-gray-500 mt-1">Grant types cannot be modified</p>
				</div>

				<!-- Active Status -->
				<div>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={selectedClient.isActive}
							class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						/>
						<span class="text-sm font-medium text-gray-700">Client Active</span>
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
