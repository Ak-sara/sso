<script lang="ts">
import Input  from '$lib/components/Input.svelte';
interface Props {
    assignment: any;
    orgmap: Record<string,string>,
    unitmap: Record<string,string>;
    positionmap: Record<string,string>;
    onSave: () => void;
}

let { assignment = $bindable(), orgmap, unitmap,positionmap, onSave }: Props = $props();

</script>
<div class="grid grid-cols-3 gap-4">
    <!-- Employee ID (NIK) -->
    <Input type="text" name="employeeId" label="NIK" value={assignment?.employeeId || ''} />
    <!-- Employment Type -->
    <Input type="select" label="Employment Type" name="employmentType" 
        value={assignment?.employmentType} options={{
            "permanent":"Permanent",
            "pkwt":"PKWT",
            "outsource":"Outsource",
            "contract":"Contract", }} />

    <!-- Employment Status -->
    <Input type="select" label="Employment Status" name="employmentStatus" 
        value={assignment?.employmentStatus} options={{
            "active":"Active",
            "probation":"Probation",
            "terminated":"Terminated",
            "resigned":"Resigned", }} />
    
    <!-- Organization -->
    <Input type="select" label="Organization" name="organizationId" value={assignment?.organizationId} options={orgmap} />
    <!-- Org Unit -->
    <Input type="select" label="Organization Unit" name="orgUnitId" value={assignment?.orgUnitId} options={unitmap} />
    <!-- Position -->
    <Input type="select" label="Position" name="positionId" value={assignment?.positionId} options={positionmap} />

    <!-- Work Location -->
    <Input type="text" label="Work Location" name="workLocation" value={assignment?.workLocation} />
</div>