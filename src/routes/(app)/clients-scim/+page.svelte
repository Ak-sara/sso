<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedClient: any = $state(null);
	let showSecretModal = $state(false);
	let newSecret = '';
	let newClientId = '';

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		alert('Copied to clipboard!');
	}

	// DataTable columns
	const columns = [
		{
			key: 'clientName',
			label: 'Client',
			sortable: true,
			render: (value: string, row: any) => `
				<div>
					<p class="font-medium text-gray-900">${value}</p>
					<p class="text-sm text-gray-500">${row.description || ''}</p>
					${row.contactEmail ? `<p class="text-xs text-gray-400">${row.contactEmail}</p>` : ''}
				</div>
			`
		},
		{
			key: 'clientId',
			label: 'Client ID',
			sortable: true,
			render: (value: string) => `
				<code class="text-xs bg-gray-100 px-2 py-1 rounded">${value}</code>
			`
		},
		{
			key: 'scopes',
			label: 'Scopes',
			sortable: false,
			render: (value: string[]) => {
				if (!value || value.length === 0) return '<span class="text-gray-400">None</span>';
				return `<div class="flex flex-wrap gap-1">${value
					.map((scope) => `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${scope}</span>`)
					.join('')}</div>`;
			}
		},
		{
			key: 'rateLimit',
			label: 'Rate Limit',
			sortable: true,
			render: (value: number) => `${value} req/min`
		},
		{
			key: 'stats',
			label: 'Stats',
			sortable: false,
			render: (value: any) => {
				if (!value) return '<span class="text-gray-400">No data</span>';
				return `
					<div class="text-sm">
						<p class="text-gray-900">${value.totalRequests} total</p>
						<p class="text-gray-600">${value.requestsLast24h} / 24h</p>
						<p class="text-gray-600">${value.avgDuration}ms avg</p>
						<p class="text-red-600">${value.errorRate}% errors</p>
					</div>
				`;
			}
		},
		{
			key: 'isActive',
			label: 'Status',
			sortable: true,
			render: (value: boolean, row: any) => {
				const colorClass = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
				const label = value ? 'Active' : 'Inactive';
				let html = `<span class="px-2 py-1 text-xs font-medium ${colorClass} rounded">${label}</span>`;
				if (row.lastUsedAt) {
					html += `<p class="text-xs text-gray-500 mt-1">Last used: ${formatDate(row.lastUsedAt)}</p>`;
				}
				return html;
			}
		}
	];

	async function handleEdit(client: any) {
		try {
			const response = await fetch(`/api/scim-clients/${client.clientId}`);
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
		if (!confirm(`⚠️ DELETE client "${client.clientName}" permanently? This action cannot be undone!`)) {
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
				description: selectedClient.description || '',
				contactEmail: selectedClient.contactEmail || '',
				scopes: selectedClient.scopes || [],
				rateLimit: selectedClient.rateLimit || 100,
				ipWhitelist: selectedClient.ipWhitelist || [],
				isActive: selectedClient.isActive
			};

			const response = await fetch(`/api/scim-clients/${selectedClient.clientId}`, {
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

	function addIpWhitelist() {
		if (!selectedClient.ipWhitelist) selectedClient.ipWhitelist = [];
		selectedClient.ipWhitelist = [...selectedClient.ipWhitelist, ''];
	}

	function removeIpWhitelist(index: number) {
		selectedClient.ipWhitelist = selectedClient.ipWhitelist.filter((_: any, i: number) => i !== index);
	}

	// Handle form success - show secret modal
	$effect(() => {
		if (form?.success && form?.plainSecret) {
			showSecretModal = true;
			newSecret = form.plainSecret;
			newClientId = form.client?.clientId || '';
		}
	});
</script>

<div class="container mx-auto p-6">
	<div class="flex justify-between items-center mb-6">
		<div>
			<h1 class="text-3xl font-bold">SCIM Client Management</h1>
			<p class="text-gray-600 mt-1">Manage OAuth 2.0 credentials for SCIM API access</p>
		</div>
		<button
			onclick={() => (showCreateModal = true)}
			class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
		>
			+ New SCIM Client
		</button>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 rounded-lg shadow">
			<p class="text-gray-600 text-sm">Total Clients</p>
			<p class="text-2xl font-bold">{data.clients.length}</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<p class="text-gray-600 text-sm">Active Clients</p>
			<p class="text-2xl font-bold text-green-600">
				{data.clients.filter((c) => c.isActive).length}
			</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<p class="text-gray-600 text-sm">Total Requests (24h)</p>
			<p class="text-2xl font-bold">
				{data.clients.reduce((sum, c) => sum + (c.stats?.requestsLast24h || 0), 0)}
			</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<p class="text-gray-600 text-sm">Avg Error Rate</p>
			<p class="text-2xl font-bold text-red-600">
				{(
					data.clients.reduce((sum, c) => sum + (c.stats?.errorRate || 0), 0) /
						data.clients.length || 0
				).toFixed(1)}%
			</p>
		</div>
	</div>

	<!-- SCIM Clients DataTable -->
	<DataTable
		data={data.clients}
		{columns}
		searchPlaceholder="Cari SCIM client (nama, client ID)..."
		onEdit={handleEdit}
		onDelete={handleDelete}
		emptyMessage="Belum ada SCIM client. Tambahkan client baru untuk memulai."
	/>
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<h2 class="text-2xl font-bold mb-4">Create SCIM Client</h2>

			<form method="POST" action="?/create" use:enhance class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">
						Client Name <span class="text-red-600">*</span>
					</label>
					<input
						type="text"
						name="clientName"
						required
						placeholder="OFM Production"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea
						name="description"
						rows="2"
						placeholder="SCIM client for OFM application"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg"
					></textarea>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
					<input
						type="email"
						name="contactEmail"
						placeholder="devops@ias.co.id"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Scopes <span class="text-red-600">*</span>
					</label>
					<div class="space-y-2">
						<label class="flex items-center">
							<input type="checkbox" name="scopes" value="read:users" checked class="mr-2" />
							<span class="text-sm">read:users - Read user data</span>
						</label>
						<label class="flex items-center">
							<input type="checkbox" name="scopes" value="write:users" class="mr-2" />
							<span class="text-sm">write:users - Create/update users</span>
						</label>
						<label class="flex items-center">
							<input type="checkbox" name="scopes" value="delete:users" class="mr-2" />
							<span class="text-sm">delete:users - Delete users</span>
						</label>
						<label class="flex items-center">
							<input type="checkbox" name="scopes" value="read:groups" checked class="mr-2" />
							<span class="text-sm">read:groups - Read group/org unit data</span>
						</label>
						<label class="flex items-center">
							<input type="checkbox" name="scopes" value="write:groups" class="mr-2" />
							<span class="text-sm">write:groups - Create/update groups</span>
						</label>
						<label class="flex items-center">
							<input type="checkbox" name="scopes" value="delete:groups" class="mr-2" />
							<span class="text-sm">delete:groups - Delete groups</span>
						</label>
						<label class="flex items-center">
							<input type="checkbox" name="scopes" value="bulk:operations" class="mr-2" />
							<span class="text-sm">bulk:operations - Bulk operations</span>
						</label>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">
						Rate Limit (requests/minute)
					</label>
					<input
						type="number"
						name="rateLimit"
						value="100"
						min="1"
						max="1000"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">
						IP Whitelist (one per line)
					</label>
					<textarea
						name="ipWhitelist"
						rows="3"
						placeholder="192.168.1.0/24&#10;10.0.0.5&#10;172.16.0.0/16"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
					></textarea>
					<p class="text-xs text-gray-500 mt-1">Leave empty to allow all IPs</p>
				</div>

				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Create Client
					</button>
				</div>
			</form>
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

				<!-- Description -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea
						bind:value={selectedClient.description}
						rows="2"
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					></textarea>
				</div>

				<!-- Contact Email -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
					<input
						type="email"
						bind:value={selectedClient.contactEmail}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Scopes -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
					<div class="space-y-2">
						{#each ['read:users', 'write:users', 'delete:users', 'read:groups', 'write:groups', 'delete:groups', 'bulk:operations'] as scopeOption}
							<label class="flex items-center">
								<input
									type="checkbox"
									checked={selectedClient.scopes?.includes(scopeOption)}
									onchange={(e) => {
										if (e.currentTarget.checked) {
											if (!selectedClient.scopes) selectedClient.scopes = [];
											selectedClient.scopes = [...selectedClient.scopes, scopeOption];
										} else {
											selectedClient.scopes = selectedClient.scopes.filter((s: string) => s !== scopeOption);
										}
									}}
									class="mr-2"
								/>
								<span class="text-sm">{scopeOption}</span>
							</label>
						{/each}
					</div>
				</div>

				<!-- Rate Limit -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Rate Limit (requests/minute)</label>
					<input
						type="number"
						bind:value={selectedClient.rateLimit}
						min="1"
						max="1000"
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- IP Whitelist -->
				<div>
					<div class="flex justify-between items-center mb-2">
						<label class="block text-sm font-medium text-gray-700">IP Whitelist</label>
						<button
							type="button"
							onclick={addIpWhitelist}
							class="text-sm text-indigo-600 hover:text-indigo-800"
						>
							+ Add IP
						</button>
					</div>
					<div class="space-y-2">
						{#each selectedClient.ipWhitelist || [] as ip, index}
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={selectedClient.ipWhitelist[index]}
									placeholder="192.168.1.0/24"
									class="flex-1 px-3 py-2 border rounded-md font-mono text-sm focus:ring-2 focus:ring-indigo-500"
								/>
								<button
									type="button"
									onclick={() => removeIpWhitelist(index)}
									class="px-3 py-2 text-red-600 hover:text-red-800"
								>
									Remove
								</button>
							</div>
						{/each}
						{#if !selectedClient.ipWhitelist || selectedClient.ipWhitelist.length === 0}
							<p class="text-sm text-gray-500">No IP restrictions (all IPs allowed)</p>
						{/if}
					</div>
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

<!-- Success Modal (shows client secret) -->
{#if showSecretModal && form?.success && form?.plainSecret}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-xl w-full">
			<h2 class="text-2xl font-bold mb-4 text-green-600">✓ Client Created Successfully!</h2>

			<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
				<p class="text-sm text-yellow-800">
					<strong>⚠️ Important:</strong> Save these credentials now. The client secret will not be shown
					again!
				</p>
			</div>

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
					<div class="flex gap-2">
						<code class="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm">
							{form.client.clientId}
						</code>
						<button
							onclick={() => copyToClipboard(form.client.clientId)}
							class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Copy
						</button>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
					<div class="flex gap-2">
						<code class="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm break-all">
							{form.plainSecret}
						</code>
						<button
							onclick={() => copyToClipboard(form.plainSecret)}
							class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Copy
						</button>
					</div>
				</div>

				<div class="bg-gray-50 p-4 rounded">
					<p class="text-sm font-medium text-gray-700 mb-2">How to get access token:</p>
					<pre
						class="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto"><code>curl -X POST \
  http://localhost:5173/scim/v2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id={form.client.clientId}" \
  -d "client_secret={form.plainSecret}"</code></pre>
				</div>
			</div>

			<div class="flex justify-end gap-3 pt-4">
				<button
					onclick={() => {
						showSecretModal = false;
						window.location.reload();
					}}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
