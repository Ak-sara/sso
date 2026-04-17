<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';

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

<FormModal title="{isNew ? 'Tambah' : 'Edit'} Karyawan Terdampak" onClose={onClose}>
	<div class="p-4">
		<form method="POST" action="?/upsertReassignment"
			use:enhance={() => async ({ result, update }) => {
				if (result.type === 'success') {
					showNotif('success', isNew ? 'Karyawan berhasil ditambahkan' : 'Data karyawan diperbarui');
					await invalidateAll();
					onClose();
				} else if (result.type === 'failure') {
					showNotif('error', (result.data as any)?.error ?? 'Gagal menyimpan');
				}
				await update({ reset: false });
			}}
			class="space-y-4">

			<input type="hidden" name="index" value={index} />

			<Input type="text" name="employeeId" label="NIK Karyawan *" bind:value={employeeId}
				placeholder="Masukkan NIK" />
			<div class="grid grid-cols-2 gap-4">
				<Input type="text" name="newOrgUnitCode" label="Kode Unit Kerja Baru"
					bind:value={newOrgUnitCode} placeholder="Contoh: DIV-001" />
				<Input type="text" name="newPositionCode" label="Kode Posisi Baru"
					bind:value={newPositionCode} placeholder="Contoh: POS-001" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<Input type="text" name="newWorkLocation" label="Lokasi Kerja Baru"
					bind:value={newWorkLocation} />
				<Input type="text" name="newRegion" label="Region Baru"
					bind:value={newRegion} />
			</div>
			<Input type="text" name="reason" label="Alasan Penempatan" bind:value={reason} />
			<Input type="text" name="notes" label="Catatan" bind:value={notes} />

			{#if !isNew && reassignment}
				<div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
					<p><span class="font-medium">Nama:</span> {reassignment.employeeName}</p>
					<p><span class="font-medium">Unit saat ini:</span> {reassignment.previousOrgUnitName ?? '-'}</p>
					<p><span class="font-medium">Posisi saat ini:</span> {reassignment.previousPositionName ?? '-'}</p>
				</div>
			{/if}

			<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<button type="button" onclick={onClose}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
					Batal
				</button>
				<button type="submit"
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
					{isNew ? 'Tambah' : 'Simpan'}
				</button>
			</div>
		</form>
	</div>
</FormModal>
