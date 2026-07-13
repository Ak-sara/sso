<script lang="ts">
	import { deserialize } from '$app/forms';
	import FormModal from '$lib/components/FormModal.svelte';
	import RealmRoleModal from './RealmRoleModal.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:realm-roles' });

	interface Props {
		realm?: any; // { _id, code, name } — null closes
		clients: { clientId: string; clientName: string }[];
	}
	let { realm = $bindable(), clients }: Props = $props();

	let roles: any[] = $state([]);
	let actRole: any = $state(null);

	async function loadRoles() {
		if (!realm?._id) return;
		try {
			const res = await fetch(`/api/realm-roles?organizationId=${encodeURIComponent(realm._id)}`);
			if (res.ok) roles = await res.json();
		} catch (err) {
			log.error('Error loading realm roles', { error: err });
		}
	}
	$effect(() => { loadRoles(); });

	function clientNames(ids: string[]) {
		return ids.map((id) => clients.find((c) => c.clientId === id)?.clientName || id);
	}

	async function removeRole(id: string) {
		if (!confirm('Delete this realm role? Any assignment using it will lose the app access it grants.')) return;
		const fd = new FormData();
		fd.append('_id', id);
		const res = await fetch('?/deleteRealmRole', { method: 'POST', body: fd });
		const result: any = deserialize(await res.text());
		if (result.type === 'failure' || result.type === 'error') {
			showNotif('error', result.data?.error ?? 'Failed to delete realm role');
			return;
		}
		showNotif('success', 'Realm role deleted');
		await loadRoles();
	}
</script>

<FormModal
	onClose={() => (realm = null)}
	title={`Realm Roles — ${realm?.name ?? ''}`}
	subtitle="App-access bundles for this realm — assign one to an identity's assignment instead of granting apps one by one">

	<div class="p-4 space-y-2">
		<div class="flex justify-end">
			<button class="text-sm text-indigo-600 hover:text-indigo-800" type="button"
				onclick={() => { actRole = { organizationId: realm._id, name: '', description: '', allowedClientIds: [], isActive: true }; }}>
				+ Add Realm Role
			</button>
		</div>

		<div class="space-y-1">
			{#each roles as role}
				<div class="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded">
					<div>
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-gray-800">{role.name}</span>
							{#if !role.isActive}
								<span class="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded">Inactive</span>
							{/if}
						</div>
						{#if role.description}<p class="text-xs text-gray-500">{role.description}</p>{/if}
						<div class="flex flex-wrap gap-1 mt-1">
							{#each clientNames(role.allowedClientIds) as name}
								<span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">{name}</span>
							{:else}
								<span class="text-xs text-gray-400">No apps granted</span>
							{/each}
						</div>
					</div>
					<div class="flex gap-3 shrink-0">
						<button class="text-indigo-600 hover:text-indigo-800 text-xs" type="button"
							onclick={() => (actRole = { ...role })}>Edit</button>
						<button class="text-red-600 hover:text-red-800 text-xs" type="button"
							onclick={() => removeRole(role._id)}>Delete</button>
					</div>
				</div>
			{:else}
				<p class="text-sm text-gray-400 px-1">No realm roles yet for this realm.</p>
			{/each}
		</div>
	</div>

	<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
		<button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
			type="button" onclick={() => (realm = null)}>Close</button>
	</div>

</FormModal>

{#if actRole}
	<RealmRoleModal bind:role={actRole} {clients} onSaved={loadRoles} />
{/if}
