<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:positions' });

	interface Props { position?: any; }
	let { position = $bindable() }: Props = $props();

	const isNew = $derived(!position?._id);

	async function save() {
		if (!position) return;
		try {
			if (isNew) {
				const fd = new FormData();
				fd.append('code', position.code);
				fd.append('name', position.name);
				if (position.grade) fd.append('grade', position.grade);
				fd.append('level', String(position.level || 0));
				if (position.description) fd.append('description', position.description);
				const res = await fetch('?/create', { method: 'POST', body: fd });
				const result = await res.json();
				if (result.type === 'failure') {
					showNotif('error', result.data?.error ?? 'Failed to create position');
					return;
				}
			} else {
				const res = await fetch(`/api/positions/${position.code}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: position.name,
						grade: position.grade || '',
						level: position.level || 0,
						description: position.description || '',
						isActive: position.isActive
					})
				});
				if (!res.ok) {
					showNotif('error', (await res.json()).error ?? 'Failed to update position');
					return;
				}
			}
			showNotif('success', isNew ? 'Position created' : 'Position updated');
			await invalidate('app:pagination');
			position = null;
		} catch (err) {
			log.error('Error saving position', { error: err });
			showNotif('error', 'Failed to save position');
		}
	}
</script>

<FormModal
	onClose={() => (position = null)}
	title={isNew ? 'Add New Position' : position?.name}
	subtitle={isNew ? 'Fill in new position details' : `Code: ${position?.code}`}>

	<div class="p-4 space-y-2">
		<div class="grid grid-cols-4 gap-2">
			{#if isNew}
				<Input type="text" label="Code *" name="code" bind:value={position.code} placeholder="MGR" />
			{:else}
				<Input type="info" label="Code" value={position.code} />
			{/if}
			<Input type="text" label="Grade" bind:value={position.grade} />
			<Input type="number" label="Level" bind:value={position.level} min={0} max={10} />
			<Input type="checkbox" label="Active" bind:value={position.isActive} />
		</div>
		<Input type="text" label="Position Name *" bind:value={position.name} />
		<Input type="textarea" label="Description" bind:value={position.description} rows={3} />
	</div>

	<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
		<button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
			type="button" onclick={() => (position = null)}>Cancel</button>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			type="button" onclick={save}>{isNew ? 'Create Position' : 'Save Changes'}</button>
	</div>

</FormModal>
