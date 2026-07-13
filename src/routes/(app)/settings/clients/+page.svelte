<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import OAuthClientModal from './OAuthClientModal.svelte';
	import PageHints from '$lib/components/PageHints.svelte';
	import { invalidate } from '$app/navigation';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:clients' });

	let { data }: { data: PageData } = $props();

	let showPageHints = $state(false);
	let actClient: any = $state(null);

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
			key: 'organizationName',
			label: 'Realm',
			sortable: true,
			render: (value: string | null) =>
				value ? `<span class="text-sm text-gray-700">${value}</span>` : '<span class="text-xs text-gray-400">Realm-agnostic</span>'
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
				const label = value ? 'Active' : 'Inactive';
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${colorClass}">${label}</span>`;
			}
		}
	];
	async function handleEdit(client: any) {
		try {
			const res = await fetch(`/api/oauth-clients/${client.clientId}`);
			if (res.ok) {
				actClient = await res.json();
			} else {
				showNotif('error', 'Failed to load client');
			}
		} catch (err) {
			log.error('Error loading client', { error: err });
			showNotif('error', 'Failed to load client');
		}
	}

	async function handleDelete(client: any) {
		if (!confirm(`Delete client "${client.clientName}"? This action cannot be undone.`)) return;
		try {
			const fd = new FormData();
			fd.append('clientId', client.clientId);
			const res = await fetch('?/delete', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.type === 'failure') {
				showNotif('error', result.data.error ?? 'Failed to delete client');
			} else {
				showNotif('success', 'Client deleted');
				await invalidate('app:pagination');
			}
		} catch (err) {
			log.error('Error deleting client', { error: err });
			showNotif('error', 'Failed to delete client');
		}
	}
</script>

<div class="space-y-6">
	<!-- OAuth Clients DataTable -->
	<DataTable
		data={data.clients}
		{columns}
		header_before="<div>
			<h1 class='text-xl font-bold'>OAuth 2.0 Client Management</h1>
			<p class='text-gray-600 mt-1'>Manage OAuth 2.0 credentials for application integration</p>
		</div>"
		header_actions={()=>[
			{
				text: 'ℹ️',
				class: 'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer',
				action: () => (showPageHints = true)
			},{
				text: '+ Add New Client',
				class: 'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
				action: () => { actClient = { clientName: '', redirectUris: [''], allowedScopes: ['openid'], grantTypes: [], isActive: false, organizationId: '' }; }
			}
		]}
		searchPlaceholder="Find client (name, client ID)..."
		onEdit={handleEdit}
		onDelete={handleDelete}
		emptyMessage="no OAuth client. Add new client to start."
	/>
</div>

<PageHints bind:visible={showPageHints}
	title='OAuth Clients'
	paragraph='<p class="mt-1 text-sm text-blue-700">
		An OAuth Client is an application that can use SSO for authentication. Each client has a
		<strong>Client ID</strong> and <strong>Client Secret</strong> used for the OAuth 2.0 flow.
		You need to configure <code class="bg-blue-100 px-1 rounded">Redirect URIs</code> and
		<code class="bg-blue-100 px-1 rounded">Allowed Scopes</code> for security.<br>
		Certificate Url: https://sso.ias.id/.well-known/jwks.json
	</p>' />

{#if actClient}
	<OAuthClientModal bind:client={actClient} organizations={data.organizations} />
{/if}
