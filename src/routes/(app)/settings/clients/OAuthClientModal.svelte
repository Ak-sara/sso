<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:clients' });

	interface Props { client?: any; organizations?: { _id: string; code: string; name: string }[]; }
	let { client = $bindable(), organizations = [] }: Props = $props();

	const isNew = $derived(!client?.clientId);
	let created: { client_id: string; client_secret: string } | null = $state(null);

	const organizationOptions = $derived({
		'': '— Realm-agnostic (any organization) —',
		...Object.fromEntries(organizations.map((o) => [o._id, `${o.code} - ${o.name}`]))
	});

	// App Roles — in-app permissions scoped to this client (edit mode only)
	let clientRoles: { _id: string; name: string; description?: string }[] = $state([]);
	let newRoleName = $state('');
	let newRoleDescription = $state('');

	async function loadClientRoles() {
		if (isNew || !client?.clientId) return;
		try {
			const res = await fetch(`/api/client-roles?clientId=${encodeURIComponent(client.clientId)}`);
			if (res.ok) clientRoles = await res.json();
		} catch (err) {
			log.error('Error loading app roles', { error: err });
		}
	}
	$effect(() => { loadClientRoles(); });

	async function addClientRole() {
		if (!newRoleName.trim()) { showNotif('error', 'Role name is required'); return; }
		const fd = new FormData();
		fd.append('clientId', client.clientId);
		fd.append('name', newRoleName.trim());
		fd.append('description', newRoleDescription.trim());

		const res = await fetch('?/createClientRole', { method: 'POST', body: fd });
		const result: any = deserialize(await res.text());
		if (result.type === 'failure' || result.type === 'error') {
			showNotif('error', result.data?.error ?? 'Failed to add app role');
			return;
		}
		newRoleName = '';
		newRoleDescription = '';
		await loadClientRoles();
	}

	async function removeClientRole(id: string) {
		const fd = new FormData();
		fd.append('_id', id);
		const res = await fetch('?/deleteClientRole', { method: 'POST', body: fd });
		const result: any = deserialize(await res.text());
		if (result.type === 'failure' || result.type === 'error') {
			showNotif('error', result.data?.error ?? 'Failed to remove app role');
			return;
		}
		await loadClientRoles();
	}

	function addRedirectUri() {
		client.redirectUris = [...(client.redirectUris || []), ''];
	}

	function removeRedirectUri(index: number) {
		client.redirectUris = client.redirectUris.filter((_: any, i: number) => i !== index);
	}

	function addScope() {
		client.allowedScopes = [...(client.allowedScopes || []), ''];
	}

	function removeScope(index: number) {
		client.allowedScopes = client.allowedScopes.filter((_: any, i: number) => i !== index);
	}

	async function createClient() {
		const name = (client.clientName || '').trim();
		const redirectUris = (client.redirectUris || []).map((u: string) => u.trim()).filter(Boolean);
		if (!name) { showNotif('error', 'Client name is required'); return; }
		if (redirectUris.length === 0) { showNotif('error', 'At least one redirect URI is required'); return; }

		const fd = new FormData();
		fd.append('name', name);
		fd.append('redirect_uris', redirectUris.join('\n'));
		fd.append('allowed_scopes', (client.allowedScopes || []).filter(Boolean).join(' '));
		fd.append('organization_id', client.organizationId || '');

		const res = await fetch('?/create', { method: 'POST', body: fd });
		const result: any = deserialize(await res.text());

		if (result.type === 'failure' || result.type === 'error') {
			showNotif('error', result.data?.error ?? 'Failed to create client');
			return;
		}

		showNotif('success', 'Client created — copy the secret now, it will not be shown again');
		await invalidate('app:pagination');
		created = result.data.client;
	}

	async function updateClient() {
		const res = await fetch(`/api/oauth-clients/${client.clientId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				clientName: client.clientName,
				redirectUris: client.redirectUris || [],
				allowedScopes: client.allowedScopes || [],
				grantTypes: client.grantTypes || [],
				isActive: client.isActive,
				organizationId: client.organizationId || ''
			})
		});
		if (res.ok) {
			showNotif('success', 'Client updated');
			await invalidate('app:pagination');
			client = null;
		} else {
			showNotif('error', (await res.json()).error ?? 'Failed to update client');
		}
	}

	async function save() {
		if (!client) return;
		try {
			if (isNew) await createClient();
			else await updateClient();
		} catch (err) {
			log.error('Error saving client', { error: err });
			showNotif('error', 'Failed to save client');
		}
	}
</script>

<FormModal
	onClose={() => (client = null)}
	title={created ? 'Client Created' : (client?.clientName || (isNew ? 'New OAuth Client' : 'OAuth Client'))}
	subtitle={created ? 'Copy the client secret now — it will not be shown again' : `Client ID: ${client?.clientId ?? ''}`}>

{#if created}
	<div class="p-4 space-y-3">
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
			<code class="block w-full px-2 py-1 bg-gray-100 rounded text-sm break-all">{created.client_id}</code>
		</div>
		<div>
			<label class="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
			<code class="block w-full px-2 py-1 bg-gray-100 rounded text-sm break-all">{created.client_secret}</code>
		</div>
	</div>
	<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			type="button" onclick={() => (client = null)}>Done</button>
	</div>
{:else}
	<div class="p-4 space-y-2">
		<Input type="text" label="Client Name" bind:value={client.clientName} />
		<Input type="select" label="Organization / Realm" options={organizationOptions} bind:value={client.organizationId} />
		<p class="text-xs text-gray-500 mt-[-.4em] ml-1">
			Restricts login to identities assigned to this organization via a matching
			Realm Role. Leave as "Realm-agnostic" for apps any authenticated identity may use.
		</p>

		<div>
			<div class="flex justify-between items-center mt-1 ml-1 mb-1">
				<label class="text-xs font-medium text-gray-700">Redirect URIs</label>
				<button class="text-xs text-indigo-600 hover:text-indigo-800" type="button" onclick={addRedirectUri}>
					+ Add URI
				</button>
			</div>
			<div class="space-y-1">
				{#each client.redirectUris || [] as _uri, index}
					<div class="flex gap-2">
						<Input type="url" placeholder="https://example.com/callback"
							bind:value={client.redirectUris[index]} style="flex-1" />
						<button class="px-3 py-1 text-red-600 hover:text-red-800 text-sm"
							type="button" onclick={() => removeRedirectUri(index)}>Remove</button>
					</div>
				{/each}
			</div>
		</div>

		<div>
			<div class="flex justify-between items-center mt-1 ml-1 mb-1">
				<label class="text-xs font-medium text-gray-700">Allowed Scopes</label>
				<button class="text-xs text-indigo-600 hover:text-indigo-800" type="button" onclick={addScope}>
					+ Add Scope
				</button>
			</div>
			<div class="space-y-1">
				{#each client.allowedScopes || [] as _scope, index}
					<div class="flex gap-2">
						<Input type="text" placeholder="openid"
							bind:value={client.allowedScopes[index]} style="flex-1" />
						<button class="px-3 py-1 text-red-600 hover:text-red-800 text-sm"
							type="button" onclick={() => removeScope(index)}>Remove</button>
					</div>
				{/each}
			</div>
		</div>

		{#if !isNew}
			<div>
				<label class="block text-xs font-medium text-gray-700 mt-1 ml-1 mb-1">Grant Types</label>
				<div class="flex flex-wrap gap-2 px-1">
					{#each client.grantTypes || [] as grantType}
						<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{grantType}</span>
					{/each}
				</div>
				<p class="text-xs text-gray-500 mt-1 ml-1">Grant types cannot be modified</p>
			</div>

			<Input type="checkbox" label="Client Active" bind:value={client.isActive} />

			<div>
				<label class="block text-xs font-medium text-gray-700 mt-1 ml-1 mb-1">App Roles</label>
				<p class="text-xs text-gray-500 ml-1 mb-1">
					In-app permissions for this client — assigned to an identity via an
					assignment, surfaced as a <code class="bg-gray-100 px-1 rounded">roles</code> claim
					in the ID token / userinfo for this app to interpret.
				</p>
				<div class="space-y-1 mb-2">
					{#each clientRoles as role}
						<div class="flex items-center justify-between gap-2 px-2 py-1 bg-gray-50 rounded">
							<div>
								<span class="text-sm font-medium text-gray-800">{role.name}</span>
								{#if role.description}<span class="text-xs text-gray-500 ml-2">{role.description}</span>{/if}
							</div>
							<button class="text-red-600 hover:text-red-800 text-xs" type="button"
								onclick={() => removeClientRole(role._id)}>Remove</button>
						</div>
					{:else}
						<p class="text-sm text-gray-400 px-1">No app roles defined</p>
					{/each}
				</div>
				<div class="flex gap-2">
					<Input type="text" placeholder="approver" bind:value={newRoleName} style="flex-1" />
					<Input type="text" placeholder="Description (optional)" bind:value={newRoleDescription} style="flex-1" />
					<button class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded" type="button"
						onclick={addClientRole}>+ Add</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
		<button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
			type="button" onclick={() => (client = null)}>Cancel</button>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			type="button" onclick={save}>{isNew ? 'Create Client' : 'Save Changes'}</button>
	</div>
{/if}

</FormModal>
