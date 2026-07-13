<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:clients-scim' });

	interface Props { client?: any; onCreated?: (result: { clientId: string; plainSecret: string }) => void; }
	let { client = $bindable(), onCreated }: Props = $props();

	const isNew = $derived(!client?.clientId);

	const scopeOptions = {
		'read:users': 'read:users', 'write:users': 'write:users', 'delete:users': 'delete:users',
		'read:groups': 'read:groups', 'write:groups': 'write:groups', 'delete:groups': 'delete:groups',
		'bulk:operations': 'bulk:operations'
	};

	function addIp() {
		client.ipWhitelist = [...(client.ipWhitelist || []), ''];
	}

	function removeIp(index: number) {
		client.ipWhitelist = client.ipWhitelist.filter((_: any, i: number) => i !== index);
	}

	async function createClient() {
		if (!client.clientName?.trim()) { showNotif('error', 'Client name is required'); return; }

		const fd = new FormData();
		fd.append('clientName', client.clientName);
		fd.append('description', client.description || '');
		fd.append('contactEmail', client.contactEmail || '');
		fd.append('scopes', JSON.stringify(client.scopes || []));
		fd.append('rateLimit', String(client.rateLimit || 100));
		fd.append('ipWhitelist', (client.ipWhitelist || []).filter(Boolean).join('\n'));

		const res = await fetch('?/create', { method: 'POST', body: fd });
		const result: any = deserialize(await res.text());

		if (result.type === 'failure' || result.type === 'error') {
			showNotif('error', result.data?.error ?? 'Failed to create client');
			return;
		}

		showNotif('success', 'Client created — copy the secret now, it will not be shown again');
		await invalidate('app:pagination');
		onCreated?.({ clientId: result.data.client.clientId, plainSecret: result.data.plainSecret });
		client = null;
	}

	async function updateClient() {
		const res = await fetch(`/api/scim-clients/${client.clientId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				clientName: client.clientName,
				description: client.description || '',
				contactEmail: client.contactEmail || '',
				scopes: client.scopes || [],
				rateLimit: client.rateLimit || 100,
				ipWhitelist: client.ipWhitelist || [],
				isActive: client.isActive
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
	title={client?.clientName || (isNew ? 'New SCIM Client' : 'SCIM Client')}
	subtitle={isNew ? '' : `Client ID: ${client?.clientId ?? ''}`}>

	<div class="p-4 space-y-2">
		<Input type="text"     label="Client Name"               bind:value={client.clientName} />
		<Input type="textarea" label="Description"               bind:value={client.description} rows={2} />
		<Input type="email"    label="Contact Email"             bind:value={client.contactEmail} />
		<Input type="number"   label="Rate Limit (req/min)"      bind:value={client.rateLimit} min={1} max={1000} />
		<Input type="multi-select" label="Scopes" options={scopeOptions} bind:value={client.scopes} />
		{#if !isNew}
			<Input type="checkbox" label="Client Active"         bind:value={client.isActive} />
		{/if}

		<div>
			<div class="flex justify-between items-center mt-1 ml-1 mb-1">
				<label class="text-xs font-medium text-gray-700">IP Whitelist</label>
				<button class="text-xs text-indigo-600 hover:text-indigo-800" type="button" onclick={addIp}>
					+ Add IP
				</button>
			</div>
			<div class="space-y-1">
				{#each client.ipWhitelist || [] as _ip, index}
					<div class="flex gap-2">
						<Input type="text" placeholder="192.168.1.0/24" bind:value={client.ipWhitelist[index]} style="flex-1" />
						<button class="px-3 py-1 text-red-600 hover:text-red-800 text-sm"
							type="button" onclick={() => removeIp(index)}>Remove</button>
					</div>
				{/each}
				{#if !client.ipWhitelist?.length}
					<p class="text-sm text-gray-500 px-1">No IP restrictions (all IPs allowed)</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
		<button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
			type="button" onclick={() => (client = null)}>Cancel</button>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			type="button" onclick={save}>{isNew ? 'Create Client' : 'Save Changes'}</button>
	</div>

</FormModal>
