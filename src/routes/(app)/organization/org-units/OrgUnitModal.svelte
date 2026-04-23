<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import LookupModal from '$lib/components/LookupModal.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:org-units' });

	interface Props {
		unit?: any;
		organizationOptions: { value: string; label: string }[];
	}
	let { unit = $bindable(), organizationOptions }: Props = $props();

	const isNew = $derived(!unit?._id);

	const orgOptions = $derived(Object.fromEntries(organizationOptions.map(o => [o.value, o.label])));

	const typeOptions = {
		board: 'Board', directorate: 'Directorate', division: 'Division',
		department: 'Department', section: 'Section', team: 'Team', sbu: 'SBU'
	};

	const diagramOptions = { block: 'Node', logical: 'Container', group: 'Group', neck: 'Neck' };

	const parentUnitColumns = [
		{ key: 'code', label: 'Code', sortable: true },
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'type', label: 'Type', sortable: true, render: (v: string) => `<span class="capitalize">${v}</span>` },
		{ key: 'level', label: 'Level', sortable: true, render: (v: number) => `Level ${v}` }
	];

	const managerColumns = [
		{ key: 'employeeId', label: 'Employee ID', sortable: true },
		{ key: 'fullName', label: 'Name', sortable: true },
		{ key: 'positionName', label: 'Position', sortable: false },
		{ key: 'orgUnitName', label: 'Org Unit', sortable: false }
	];

	function toFormData(u: any): FormData {
		const f = new FormData();
		const skip = new Set(['parentName', 'groupName', 'picName', 'managerName']);
		for (const [key, val] of Object.entries(u))
			if (!skip.has(key) && val !== null && val !== undefined)
				f.append(key, String(val));
		return f;
	}

	async function save() {
		if (!unit) return;
		try {
			const res = await fetch(isNew ? '?/create' : '?/update', {
				method: 'POST',
				body: toFormData(unit)
			});
			const result = await res.json();
			if (result.type === 'failure') {
				showNotif('error', JSON.parse(result.data).slice(1).join(' ') ?? 'Operasi gagal');
				return;
			}
			showNotif('success', isNew ? 'Unit kerja berhasil dibuat' : 'Unit kerja berhasil disimpan');
			await invalidate('app:pagination');
			unit = null;
		} catch (err) {
			log.error('Error saving unit', { error: err });
			showNotif('error', 'Operasi gagal');
		}
	}
</script>

<FormModal
	onClose={() => (unit = null)}
	title={isNew ? 'Tambah Unit Kerja' : unit?.name}
	subtitle={isNew ? 'Isi data unit kerja baru' : `Kode: ${unit?.code}`}>

	<div class="p-4 space-y-2">
		<div class="grid grid-cols-[3fr_1fr_1fr] gap-2">
			{#if isNew}
				<Input type="text" label="Kode Unit *" bind:value={unit.code} placeholder="DIR-001" />
			{:else}
				<Input type="info" label="Kode Unit" value={unit.code} />
			{/if}
			<Input type="checkbox" label="Unit Aktif"  bind:value={unit.isActive} />
			<Input type="select"   label="STO Mode"    bind:value={unit.diagram} options={diagramOptions} />
		</div>

		<div class="grid grid-cols-2 gap-2">
			<Input type="text" label="Nama Unit *"   bind:value={unit.name} />
			<Input type="text" label="Nama Singkat"  bind:value={unit.shortName} placeholder="Opsional" />
		</div>

		<Input type="textarea" label="Deskripsi" bind:value={unit.description} rows={2} />

		<div class="grid grid-cols-2 gap-2">
			<Input type="select" label="Organisasi" bind:value={unit.organizationId} options={orgOptions} />
			<Input type="select" label="Tipe Unit"  bind:value={unit.type} options={typeOptions} />
		</div>

		<LookupModal
			bind:value={unit.parentId}
			displayValue={unit.parentName || ''}
			fetchEndpoint="/api/org-units/search?organizationId={unit.organizationId}&currentUnitId={unit._id}"
			columns={parentUnitColumns}
			placeholder="Klik untuk memilih parent unit..."
			label="Parent Unit" title="Select Parent Unit"
			onSelect={(item) => {
				unit.parentId = item ? item._id : null;
				unit.parentName = item ? `${item.code} - ${item.name}` : '';
			}}
		/>
		<LookupModal
			bind:value={unit.groupId}
			displayValue={unit.groupName || ''}
			fetchEndpoint="/api/org-units/search?organizationId={unit.organizationId}&currentUnitId={unit._id}"
			columns={parentUnitColumns}
			placeholder="Klik untuk memilih group..."
			label="Group" title="Select Group"
			onSelect={(item) => {
				unit.groupId = item ? item._id : null;
				unit.groupName = item ? `${item.code} - ${item.name}` : '';
			}}
		/>
		<LookupModal
			bind:value={unit.picId}
			displayValue={unit.picName || ''}
			fetchEndpoint="/api/org-units/search?organizationId={unit.organizationId}&currentUnitId={unit._id}"
			columns={parentUnitColumns}
			placeholder="Klik untuk memilih PIC..."
			label="PIC" title="Select PIC"
			onSelect={(item) => {
				unit.picId = item ? item._id : null;
				unit.picName = item ? `${item.code} - ${item.name}` : '';
			}}
		/>
		<LookupModal
			bind:value={unit.managerId}
			displayValue={unit.managerName || ''}
			fetchEndpoint="/api/identities/search?identityType=employee"
			columns={managerColumns}
			placeholder="Klik untuk memilih manager..."
			label="Manager (Unit Head)" title="Select Manager"
			onSelect={(item) => {
				unit.managerId = item ? item._id : null;
				unit.managerName = item ? `${item.employeeId} - ${item.fullName}` : '';
			}}
		/>
	</div>

	<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
		<button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
			type="button" onclick={() => (unit = null)}>Batal</button>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			type="button" onclick={save}>{isNew ? '+ Buat Unit' : 'Save Changes'}</button>
	</div>

</FormModal>
