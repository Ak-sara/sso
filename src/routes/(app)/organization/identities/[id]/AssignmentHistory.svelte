<script lang="ts">
import { invalidateAll } from '$app/navigation';
import FormModal from '$lib/components/FormModal.svelte';
import Input from '$lib/components/Input.svelte';
import { formEnhance } from '$lib/utils/form-enhance';

interface Props {
	assignment: any;
	orgmap: Record<string, string>;
	unitmap: Record<string, string>;
	positionmap: Record<string, string>;
	onSaved: () => void;
}

let { assignment = $bindable(), orgmap, unitmap, positionmap, onSaved }: Props = $props();

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
			<Input type="select" label="Organization" name="organizationId" bind:value={assignment.organizationId} options={orgmap} />
			<Input type="select" label="Organization Unit" name="orgUnitId" bind:value={assignment.orgUnitId} options={unitmap} />
			<Input type="select" label="Position" name="positionId" bind:value={assignment.positionId} options={positionmap} />
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