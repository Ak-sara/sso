<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import ScimClientModal from './ScimClientModal.svelte';
	import { invalidate } from '$app/navigation';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:clients-scim' });

	let { data, form }: { data: PageData; form?: any } = $props();

	let actClient: any = $state(null);

	// formatDate imported from $lib/utils/format — local override kept for datetime format
	function formatDateTime(date: Date | string) {
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
		showNotif('success', 'Copied to clipboard!');
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
					html += `<p class="text-xs text-gray-500 mt-1">Last used: ${formatDateTime(row.lastUsedAt)}</p>`;
				}
				return html;
			}
		}
	];

	async function handleEdit(client: any) {
		try {
			const res = await fetch(`/api/scim-clients/${client.clientId}`);
			if (res.ok) {
				actClient = await res.json();
			} else {
				showNotif('error', 'Gagal memuat data client');
			}
		} catch (err) {
			log.error('Error loading client', { error: err });
			showNotif('error', 'Gagal memuat data client');
		}
	}

	async function handleDelete(client: any) {
		if (!confirm(`Hapus client "${client.clientName}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;
		try {
			const fd = new FormData();
			fd.append('clientId', client.clientId);
			const res = await fetch('?/delete', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.type === 'failure') {
				showNotif('error', result.data.error ?? 'Gagal menghapus client');
			} else {
				showNotif('success', 'Client berhasil dihapus');
				await invalidate('app:pagination');
			}
		} catch (err) {
			log.error('Error deleting client', { error: err });
			showNotif('error', 'Gagal menghapus client');
		}
	}

</script>

<div class="container mx-auto p-6">
	<!-- SCIM Clients DataTable -->
	<DataTable
		data={data.clients}
		{columns}
		header_before="<div>
			<h1 class='text-xl font-bold'>SCIM Client Management</h1>
			<p class='text-gray-600 mt-1'>Manage OAuth 2.0 credentials for SCIM API access</p>
		</div>"
		header_actions={()=>[
			{
				text: '+ Add New Client',
				class: 'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
				action: () => { actClient = { clientName: '', description: '', contactEmail: '', scopes: [], rateLimit: 100, ipWhitelist: [], isActive: false }; }
			}
		]}
		searchPlaceholder="Cari SCIM client (nama, client ID)..."
		onEdit={handleEdit}
		onDelete={handleDelete}
		emptyMessage="Belum ada SCIM client. Tambahkan client baru untuk memulai."
	/>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
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
</div>


{#if actClient}
	<ScimClientModal bind:client={actClient} />
{/if}

<!-- Success Modal (shows client secret) -->
{#if form?.plainSecret && form?.client}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-xl w-full">
			<h2 class="text-2xl font-bold mb-4 text-green-600">✓ Client Created Successfully!</h2>

			<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
				<p class="text-sm text-yellow-800">
					<strong>⚠️ Important:</strong> Save these credentials now. The client secret will not be shown again!
				</p>
			</div>

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
					<div class="flex gap-2">
						<code class="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm">
							{form.client.clientId}
						</code>
						<button class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							onclick={() => copyToClipboard(form.client.clientId)} > Copy </button>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
					<div class="flex gap-2">
						<code class="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm break-all">
							{form.plainSecret}
						</code>
						<button class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							onclick={() => copyToClipboard(form.plainSecret)} > Copy </button>
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
				<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					onclick={() => window.location.reload()} > Done </button>
			</div>
		</div>
	</div>
{/if}
