<script lang="ts">
import { invalidateAll } from '$app/navigation';
import FormModal from '$lib/components/FormModal.svelte';
import Input from '$lib/components/Input.svelte';
import LookupModal from '$lib/components/LookupModal.svelte';
import { formEnhance } from '$lib/utils/form-enhance';

interface Props {
	assignment: any;
	orgmap: Record<string, string>;
	unitmap: Record<string, string>;
	positionmap: Record<string, string>;
	organizations: { _id: string; name: string; code: string }[];
	orgUnits: { _id: string; name: string; code: string }[];
	positions: { _id: string; name: string; code: string }[];
	onSaved: () => void;
}

let { assignment = $bindable(), orgmap, unitmap, positionmap, organizations, orgUnits, positions, onSaved }: Props = $props();

const lookupColumns = [
	{ key: 'code', label: 'Code', sortable: true },
	{ key: 'name', label: 'Name', sortable: true }
];

// positions use code as positionId, so remap _id → code
const positionItems = $derived(positions.map(p => ({ ...p, _id: p.code })));

// Use local state to avoid bind:value={undefined} when assignment fields are missing
let orgId = $state<string | null>(assignment.organizationId ?? null);
let unitId = $state<string | null>(assignment.orgUnitId ?? null);
let posId = $state<string | null>(assignment.positionId ?? null);

let orgName = $state(orgmap[assignment.organizationId ?? ''] ?? '');
let unitName = $state(unitmap[assignment.orgUnitId ?? ''] ?? '');
let positionName = $state(positionmap[assignment.positionId ?? ''] ?? '');
</script>

<FormModal wide onClose={() => { assignment = null; }}
	title={assignment._id ? assignment.name : 'Tambah Assignment'}
	subtitle={assignment._id ? `Kode: ${assignment.employeeId} (${assignment._id})` : 'create new Assignment'} >

<form method="POST" action="?/upsertAssignment" use:formEnhance={{ success: 'Assignment disimpan', onSuccess: async () => { await invalidateAll(); onSaved(); } }}>
	<input type="hidden" name="_id" value={assignment._id ?? ''} />
	<div class="p-6 space-y-4">
		<div class="grid grid-cols-5 gap-4">
			<Input type="date" label="from" name="startDate" bind:value={assignment.startDate} />
			<Input type="date" label="to" name="endDate" bind:value={assignment.endDate} />
			<Input type="text" name="employeeId" label="NIK" bind:value={assignment.employeeId} />
			<Input type="select" label="Employment Type" name="employmentType"
				bind:value={assignment.employmentType} options={{
					"permanent":"Permanent","pkwt":"PKWT","outsource":"Outsource","contract":"Contract" }} />
			<Input type="select" label="Employment Status" name="employmentStatus"
				bind:value={assignment.employmentStatus} options={{
					"active":"Active","probation":"Probation","terminated":"Terminated","resigned":"Resigned" }} />
		</div>
		<div class="grid grid-cols-3 gap-4">
			<input type="hidden" name="organizationId" value={orgId ?? ''} />
			<LookupModal
				bind:value={orgId}
				displayValue={orgName}
				localItems={organizations}
				columns={lookupColumns}
				label="Organization" title="Pilih Organization"
				placeholder="Klik untuk memilih organisasi..."
				onSelect={(item) => { orgId = item?._id ?? null; orgName = item?.name ?? ''; }}
			/>

			<input type="hidden" name="orgUnitId" value={unitId ?? ''} />
			<LookupModal
				bind:value={unitId}
				displayValue={unitName}
				localItems={orgUnits}
				columns={lookupColumns}
				label="Organization Unit" title="Pilih Org Unit"
				placeholder="Klik untuk memilih unit..."
				onSelect={(item) => { unitId = item?._id ?? null; unitName = item?.name ?? ''; }}
			/>

			<input type="hidden" name="positionId" value={posId ?? ''} />
			<LookupModal
				bind:value={posId}
				displayValue={positionName}
				localItems={positionItems}
				columns={lookupColumns}
				label="Position" title="Pilih Position"
				placeholder="Klik untuk memilih posisi..."
				onSelect={(item) => { posId = item?._id ?? null; positionName = item?.name ?? ''; }}
			/>

			<Input type="text" label="Region" name="region" bind:value={assignment.region} />
			<Input type="text" label="Location" name="workLocation" bind:value={assignment.workLocation} />
			<Input type="checkbox" label="Remote" name="isRemote" bind:value={assignment.isRemote} />
			<Input type="text" label="Assignment Letter" name="letterId" bind:value={assignment.letterId} />
			<Input type="text" label="Assignment Letter Nbr" name="letterNo" bind:value={assignment.letterNo} />
		</div>
		<button type="submit"
			class="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md">
			💾 Simpan
		</button>
	</div>
</form>
</FormModal>
