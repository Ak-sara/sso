<script lang="ts">
	import { deserialize } from '$app/forms';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:realm-roles' });

	interface Props {
		role?: any; // { _id?, organizationId, name, description, allowedClientIds, isActive }
		clients: { clientId: string; clientName: string }[];
		onSaved: () => void;
	}
	let { role = $bindable(), clients, onSaved }: Props = $props();

	const isNew = $derived(!role?._id);
	const clientOptions = $derived(Object.fromEntries(clients.map((c) => [c.clientId, c.clientName])));

	async function save() {
		if (!role) return;
		if (!role.name?.trim()) { showNotif('error', 'Role name is required'); return; }

		try {
			const fd = new FormData();
			fd.append('organizationId', role.organizationId);
			fd.append('name', role.name);
			fd.append('description', role.description || '');
			fd.append('allowedClientIds', JSON.stringify(role.allowedClientIds || []));
			if (!isNew) {
				fd.append('_id', role._id);
				fd.append('isActive', String(!!role.isActive));
			}

			const res = await fetch(isNew ? '?/createRealmRole' : '?/updateRealmRole', { method: 'POST', body: fd });
			const result: any = deserialize(await res.text());

			if (result.type === 'failure' || result.type === 'error') {
				showNotif('error', result.data?.error ?? 'Failed to save realm role');
				return;
			}

			showNotif('success', isNew ? 'Realm role created' : 'Realm role updated');
			role = null;
			onSaved();
		} catch (err) {
			log.error('Error saving realm role', { error: err });
			showNotif('error', 'Failed to save realm role');
		}
	}
</script>

<FormModal
	nested
	onClose={() => (role = null)}
	title={role?.name || (isNew ? 'New Realm Role' : 'Realm Role')}
	subtitle="An app-access bundle assigned to an identity's assignment for this realm">

	<div class="p-4 space-y-2">
		<Input type="text" label="Role Name" placeholder="Standard Employee" bind:value={role.name} />
		<Input type="textarea" label="Description" bind:value={role.description} rows={2} />
		<Input type="multi-select" label="Grants access to these apps" options={clientOptions} bind:value={role.allowedClientIds} />
		{#if !isNew}
			<Input type="checkbox" label="Role Active" bind:value={role.isActive} />
		{/if}
	</div>

	<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
		<button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
			type="button" onclick={() => (role = null)}>Cancel</button>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			type="button" onclick={save}>{isNew ? 'Create Role' : 'Save Changes'}</button>
	</div>

</FormModal>
