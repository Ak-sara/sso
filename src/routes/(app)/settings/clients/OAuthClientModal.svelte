<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:clients' });

	interface Props { client?: any; }
	let { client = $bindable() }: Props = $props();

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

	async function save() {
		if (!client) return;
		try {
			const res = await fetch(`/api/oauth-clients/${client.clientId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clientName: client.clientName,
					redirectUris: client.redirectUris || [],
					allowedScopes: client.allowedScopes || [],
					grantTypes: client.grantTypes || [],
					isActive: client.isActive
				})
			});
			if (res.ok) {
				showNotif('success', 'Client berhasil diperbarui');
				await invalidate('app:pagination');
				client = null;
			} else {
				showNotif('error', (await res.json()).error ?? 'Gagal memperbarui client');
			}
		} catch (err) {
			log.error('Error updating client', { error: err });
			showNotif('error', 'Gagal memperbarui client');
		}
	}
</script>

<FormModal
	onClose={() => (client = null)}
	title={client?.clientName || 'OAuth Client'}
	subtitle={`Client ID: ${client?.clientId ?? ''}`}>

	<div class="p-4 space-y-2">
		<Input type="text" label="Client Name" bind:value={client.clientName} />

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
	</div>

	<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
		<button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
			type="button" onclick={() => (client = null)}>Batal</button>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			type="button" onclick={save}>Save Changes</button>
	</div>

</FormModal>
