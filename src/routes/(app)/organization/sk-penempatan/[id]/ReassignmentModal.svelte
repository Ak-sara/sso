<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { formEnhance } from '$lib/utils/form-enhance';

	interface Props {
		index?: number;
		reassignment?: any;
		onClose: () => void;
	}

	let { index = -1, reassignment = null, onClose }: Props = $props();

	const isNew = $derived(index < 0);

	let employeeId = $state(reassignment?.employeeId ?? '');
	let newOrgUnitCode = $state('');
	let newPositionCode = $state('');
	let newWorkLocation = $state(reassignment?.newWorkLocation ?? '');
	let newRegion = $state(reassignment?.newRegion ?? '');
	let reason = $state(reassignment?.reason ?? '');
	let notes = $state(reassignment?.notes ?? '');
</script>

<FormModal title="{isNew ? 'Add' : 'Edit'} Affected Employee" onClose={onClose}>
	<div class="p-4">
		<form method="POST" action="?/upsertReassignment"
			use:formEnhance={{ onSuccess: async () => {
				showNotif('success', isNew ? 'Employee added' : 'Employee updated');
				await invalidateAll();
				onClose();
			} }}
			class="space-y-4">

			<input type="hidden" name="index" value={index} />

			<Input type="text" name="employeeId" label="Employee ID *" bind:value={employeeId}
				placeholder="Enter Employee ID" />
			<div class="grid grid-cols-2 gap-4">
				<Input type="text" name="newOrgUnitCode" label="New Work Unit Code"
					bind:value={newOrgUnitCode} placeholder="e.g. DIV-001" />
				<Input type="text" name="newPositionCode" label="New Position Code"
					bind:value={newPositionCode} placeholder="e.g. POS-001" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<Input type="text" name="newWorkLocation" label="New Work Location"
					bind:value={newWorkLocation} />
				<Input type="text" name="newRegion" label="New Region"
					bind:value={newRegion} />
			</div>
			<Input type="text" name="reason" label="Placement Reason" bind:value={reason} />
			<Input type="text" name="notes" label="Notes" bind:value={notes} />

			{#if !isNew && reassignment}
				<div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
					<p><span class="font-medium">Nama:</span> {reassignment.employeeName}</p>
					<p><span class="font-medium">Current unit:</span> {reassignment.previousOrgUnitName ?? '-'}</p>
					<p><span class="font-medium">Current position:</span> {reassignment.previousPositionName ?? '-'}</p>
				</div>
			{/if}

			<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<button type="button" onclick={onClose}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
					Cancel
				</button>
				<button type="submit"
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
					{isNew ? 'Add' : 'Save'}
				</button>
			</div>
		</form>
	</div>
</FormModal>
