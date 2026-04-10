<script lang="ts">
	import LookupModal from '$lib/components/LookupModal.svelte';
	
	interface Props {
		unit: any;
		organizationOptions: { value: string; label: string }[];
		onSave: () => void;
	}

	let { unit = $bindable(), organizationOptions, onSave }: Props = $props();

	const parentUnitColumns = [
		{ key: 'code', label: 'Code', sortable: true },
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'type', label: 'Type', sortable: true, render: (value: string) => `<span class="capitalize">${value}</span>` },
		{ key: 'level', label: 'Level', sortable: true, render: (value: number) => `Level ${value}` }
	];

	const managerColumns = [
		{ key: 'employeeId', label: 'Employee ID', sortable: true },
		{ key: 'fullName', label: 'Name', sortable: true },
		{ key: 'positionName', label: 'Position', sortable: false },
		{ key: 'orgUnitName', label: 'Org Unit', sortable: false }
	];
</script>

<!-- Content -->
<div class="p-6 space-y-4">
	<!-- Code -->
	<div class="grid grid-cols-[3fr_1fr_1fr] gap-4" >
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Kode Unit</label>
			{#if unit._id}
				<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{unit.code}</p>
				<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah {unit._id}</p>
			{:else}
				<input type="text" bind:value={unit.code} class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="DIR-001" required />
			{/if}
		</div>

		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
			<label class="flex items-center gap-2">
				<input class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
					type="checkbox" bind:checked={unit.isActive}/>
				<span class="text-sm">Unit Aktif</span>
			</label>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">STO Mode</label>
			<select class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				bind:value={unit.diagram} >
				<option value="block">Node</option>
				<option value="logical">Container</option>
				<option value="group">Group</option>
				<option value="neck">Neck</option>
			</select>
		</div>
	</div>
	
	<!-- Name & Short Name -->
	<div class="grid grid-cols-2 gap-4" >
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Nama Unit</label>
			<input
				type="text"
				bind:value={unit.name}
				class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
			/>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Nama Singkat</label>
			<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				type="text" bind:value={unit.shortName} placeholder="Opsional" />
		</div>
	</div>

	<!-- Description -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
		<textarea
			bind:value={unit.description}
			rows="3"
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		></textarea>
	</div>

	<!-- Type -->
	 <!-- Organization -->
	<div class="grid grid-cols-2 gap-4" >
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Organisasi</label>
			<select class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				bind:value={unit.organizationId} >
				{#each organizationOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Tipe Unit</label>
			<select	class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				bind:value={unit.type}>
				<option value="board">Board</option>
				<option value="directorate">Directorate</option>
				<option value="division">Division</option>
				<option value="department">Department</option>
				<option value="section">Section</option>
				<option value="team">Team</option>
				<option value="sbu">SBU</option>
			</select>
		</div>
	</div>

	<!-- Parent Unit -->
	<LookupModal
		bind:value={unit.parentId}
		displayValue={unit.parentName || ''}
		fetchEndpoint="/api/org-units/search?organizationId={unit.organizationId}&currentUnitId={unit._id}"
		columns={parentUnitColumns}
		placeholder="Click to select parent unit..."
		label="Parent Unit"
		title="Select Parent Unit"
		onSelect={(item) => {
			if (item) {
				unit.parentId = item._id;
				unit.parentName = `${item.code} - ${item.name}`;
			} else {
				unit.parentId = null;
				unit.parentName = '';
			}
		}}
	/>
	<!-- GroupId -->
	<LookupModal
		bind:value={unit.groupId}
		displayValue={unit.groupName || ''}
		fetchEndpoint="/api/org-units/search?organizationId={unit.organizationId}&currentUnitId={unit._id}"
		columns={parentUnitColumns}
		placeholder="Click to select parent unit..."
		label="Group"
		title="Select Group"
		onSelect={(item) => {
			if (item) {
				unit.groupId = item._id;
				unit.groupName = `${item.code} - ${item.name}`;
			} else {
				unit.groupId = null;
				unit.groupName = '';
			}
		}}
	/>

	<!-- picId -->
	<LookupModal
		bind:value={unit.picId}
		displayValue={unit.picName || ''}
		fetchEndpoint="/api/org-units/search?organizationId={unit.organizationId}&currentUnitId={unit._id}"
		columns={parentUnitColumns}
		placeholder="Click to select PIC..."
		label="PIC"
		title="Select PIC"
		onSelect={(item) => {
			if (item) {
				unit.picId = item._id;
				unit.picName = `${item.code} - ${item.name}`;
			} else {
				unit.picId = null;
				unit.picName = '';
			}
		}}
	/>

	<!-- Manager -->
	<LookupModal
		bind:value={unit.managerId}
		displayValue={unit.managerName || ''}
		fetchEndpoint="/api/identities/search?identityType=employee"
		columns={managerColumns}
		placeholder="Click to select manager..."
		label="Manager (Unit Head)"
		title="Select Manager"
		onSelect={(item) => {
			if (item) {
				unit.managerId = item._id;
				unit.managerName = `${item.employeeId} - ${item.fullName}`;
			} else {
				unit.managerId = null;
				unit.managerName = '';
			}
		}}
	/>

</div>

<!-- Footer -->
<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
	<button
		onclick={onSave}
		class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
	>
		{unit._id ? 'Save Changes' : '+ Buat Unit'}
	</button>
</div>

