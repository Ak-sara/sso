<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { useLogger } from '$lib/logger';
	import { formEnhance } from '$lib/utils/form-enhance';
	import Input from '$lib/components/Input.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import AssignmentHistory from '$lib/components/AssignmentHistory.svelte';
	import { formatDate, datamap } from '$lib/utils/format';
	import { navigateWithParams } from '$lib/utils/navigate';
	import { showNotif } from '$lib/stores/notif.svelte';

	const log = useLogger({ module: 'app:identity-detail' });

	let { data }: { data: PageData } = $props();
	
	const getIdentityTypeBadge = (type: string) => {
		const badges: Record<string, { color: string; label: string }> = {
			employee: { color: 'bg-blue-100 text-blue-800', label: 'Employee' },
			partner: { color: 'bg-purple-100 text-purple-800', label: 'Partner' },
			external: { color: 'bg-green-100 text-green-800', label: 'External' },
			service_account: { color: 'bg-gray-100 text-gray-800', label: 'Service Account' }
		};
		return badges[type] || badges.external;
	};
	const badge = $derived(getIdentityTypeBadge(data.identity?.identityType as string));

	const partner_type={
		"vendor":"Vendor",
		"consultant":"Consultant",
		"contractor":"Contractor",
		"supplier":"Supplier", }
	const roles={
		"user":"User",
		"admin":"Admin",
		"hr":"HR",
		"manager":"Manager", }
	const orgmap:Record<string,string>=datamap(data.organizations);
	const unitmap:Record<string,string>=datamap(data.orgUnits);	
	const positionmap:Record<string,string>=datamap(data.positions,"code","name");	

	let selectedAssignment: any = $state(null);

	const columns = [
		{
			key: 'employeeId', label: 'NIK',  render: (value: string, row: any) => `
				<div class="flex items-center">
					<div> ${value} </div>
					<span class="text-sm ml-2 rounded-full bg-violet-200 text-violet-400 px-2">${row.employmentType}</span>
				</div>`
		}, {
			key: 'organizationId', label: 'Realm',
			render: (value: string) => `<code class="bg-yellow-100 px-2 py-1 rounded text-xs">${value}</code>`
		}, {
			key: 'orgUnitId', label: 'Org Unit', 
			render: (value: string) => `<code class="bg-gray-100 px-2 py-1 rounded text-xs">${value}</code>`
		}, {
			key: 'positionId', label: 'Position',
			render: (value: string) => `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${value}</span>`
		},
		{	key: 'startDate', label: 'from', render: (value: string) => formatDate(value) },
		{ 	key: 'endDate', label: 'to', render: (value: string) => formatDate(value) },
		{
			key: 'isRemote', label: 'Remote', 
			render: (value: boolean) => {
				const cls = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${cls}">${value ? 'Remote' : 'On-Site'}</span>`;
			}
		}
	];
	
	async function editAssignment(aaa: any | 'new'){
		try {
			selectedAssignment=(aaa === 'new') ? {} : aaa;
		} catch (err) { log.error('Error loading unit', { error: err }); }
	}
	async function deleteAssignment(aaa: any){
		if (!confirm(`Delete assignment for employee "${aaa.employeeId}"? This action cannot be undone.`)) return;
		try {
			const f = new FormData();
			f.append('assignmentId', aaa._id?.toString() as string);
			const response = await fetch('?/deleteAssignment', { method: 'POST', body: f });
			const result = await response.json();
			if (result.type === 'failure') { showNotif('error', result.data?.error ?? 'Failed to delete'); return; }
			showNotif('success', 'Assignment deleted');
			await invalidateAll();
		} catch (err) { log.error('Error deleting assignment', { error: err }); }
	}
</script>

<div class="max-w-7xl mx-auto">
<!-- Header -->
<div class="flex items-center justify-between mb-3">
	<div class="flex items-center space-x-4">
		<a href="/organization/identities" class="text-gray-500 hover:text-gray-700">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<div>
			<h1 class="text-2xl text-gray-900"> Identity: 
				<span class="font-bold"> {data.identity?.email} </span> | 
				<span class="font-bold"> {data.identity?.employeeId}</span>
			</h1>
			<p class="text-sm text-gray-500">
				<span class="px-2 py-1 rounded text-xs font-medium {badge.color}"> {badge.label} </span>
			</p>
		</div>
	</div>
	<div class="flex space-x-2"> </div>
</div>

<!-- Main Content -->
<form method="POST" action={data.isNew ? '?/create' : '?/update'} use:formEnhance={'Data is saved'}>
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<!-- Basic Info -->
		<div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">Personal</h2>
			<button class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
				type="submit"> 💾 Save
			</button>
		</div>
		<div class="grid grid-cols-2 gap-4 px-6 py-4 space-y-4">
			<div>
				<div class="grid grid-cols-[auto_1fr] gap-4 mb-2">
					<Input type="avatar" label="" style="self-center" value={data.identity?.avatar}  />
					<div>
						<!-- Name -->
						<div class="grid grid-cols-2 gap-4">
							<Input type="text" label="First Name" name="firstName" value={data.identity?.firstName}  />
							<Input type="text" label="Last Name" name="lastName" value={data.identity?.lastName}  />
						</div>		
					</div>
				</div>
				
				<!-- // Demographics -->
				<div class="grid grid-cols-[1fr_2fr] gap-4">
					<Input type="select" name="gender" label="Gender" value={data.identity?.gender || ''} options={{male:"Male",female:"Female"}} />
					<Input type="date" name="dateOfBirth" label="dateOfBirth" value={data.identity?.dateOfBirth || ''} />
				</div>
				
				<Input type="text" name="idNumber" label="ID Number/Ktp" value={data.identity?.idNumber || ''} />
				<Input type="text" name="taxId" label="Tax Id/npwp" value={data.identity?.taxId || ''} />
			{#if data.identity === null}
				<Input type="select" label="Type" name="identityType" value="employee" options={{employee:"Employee",partner:"Partner"}}/>
				<div>
					<label class="block text-xs font-medium text-gray-700 mt-1 ml-1 mb-[-.1em]">Password</label>
					<input class="w-full px-2 py-1 border border-gray-300 rounded-md" type="password" name="password" value="aksara" />
				</div>
			{/if}
			</div>
			<div>
				<div class="grid grid-cols-[1fr_auto_auto]">
					<Input type="text" label="Email" name="email" value={data.identity?.email}  />
					<Input type="checkbox" label="Verified Email" name="emailVerified" value={data.identity?.emailVerified}  />
					<!-- is account Active -->
					<Input type="checkbox" label="Active" name="isActive" value={data.identity?.isActive}  />
				</div>
				<Input type="text" name="personalEmail" label="personal Email" value={data.identity?.personalEmail || ''} />
				<!-- Phone -->
				<Input type="text" label="Phone" name="phone" value={data.identity?.phone}  />
				<div class="grid grid-cols-2 gap-4 items-center">
					<Input type="multi-select" label="Role" name="roles" value={data.identity?.roles} options={roles} />
					<div>
						{#if data.identity?.lastLogin}
							<Input type="info" label="Last Login" value=": {formatDate(data.identity?.lastLogin)}" />
						{/if}
						<Input type="info" label="Create At" value=": {formatDate(data.identity?.createdAt)}" />
						<Input type="info" label="Update At" value=": {formatDate(data.identity?.updatedAt)}" />				
					</div>
				</div>
			</div>
		</div>

		<!-- Partner Specific Fields -->
		{#if data.identity?.identityType === 'partner'}
			<div class="px-6 py-4 bg-gray-50 border-t border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Partner Information</h2>
			</div>
			<div class="px-6 py-4 space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<!-- Company Name -->
					<Input type="text" label="Company Name" name="companyName" value={data.identity?.companyName} />
					
					<!-- Partner Type -->
					<Input type="select" label="Partner Type" name="partnerType" value={data.identity?.partnerType} options={partner_type} />
				</div>
			</div>
		{/if}

		<!-- Current -->
		<div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">Main Employment</h2>
		</div>
		<div class="grid grid-cols-3 px-6 py-4">
			<Input type="info" label="Start" value=": {formatDate(data.identity?.joinDate)}" />
			<Input type="info" label="Probation End" value=": {formatDate(data.identity?.probationEndDate)}" />
			<Input type="info" label="End" value=": {formatDate(data.identity?.endDate)}" />
			
			<Input type="info" label="NIK" value=": {data.identity?.employeeId}" />
			<Input type="info" label="Employment Type" value=": {data.identity?.employmentType}" />
			<Input type="info" label="Employment Status" value=": {data.identity?.employmentStatus}" />
			
			<Input type="info" label="Organization" value=": {orgmap[(data.identity?.organizationId)??'']}" />
			<Input type="info" label="Organization Unit" value=": {unitmap[(data.identity?.orgUnitId)??'']}" />
			<Input type="info" label="Position" value=": {positionmap[(data.identity?.positionId)??'']}" />

			<Input type="info" label="Region" value=": {data.identity?.region}" />
			<Input type="info" label="Work Location" value=": {data.identity?.workLocation}" />
			<Input type="info" label="Remote" value=": {data.identity?.isRemote}" />
		</div>

	</div>
</form>
<!-- Assignment -->
{#if data.identity?.identityType === 'employee'}
	<DataTable data={data.assignments as any}
		{columns}
		searchable={false}
		emptyMessage="Add new Assignment..."
		cssClass="my-4"
		header_before="<h2 class='ml-5 text-lg font-semibold text-gray-900'>Assignment History</h2>"
		header_actions={()=>[
			{
				text: '+ Assignment',
				class: 'px-4 py-1 bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer text-white rounded-md transition-colors',
				action: ()=>{ editAssignment('new') }
			}
		]}
		onPageChange={(p) => navigateWithParams({ page: String(p) })}
		onPageSizeChange={(s) => navigateWithParams({ pageSize: String(s), page: '1' })}
		actions={(row) => [
			{ label: 'Edit',   onClick: () => editAssignment(row),   class: 'text-indigo-600 hover:text-indigo-800', icon: '✏️ ' },
			{ label: 'Delete', onClick: () => deleteAssignment(row), class: 'text-red-600 hover:text-red-800',    icon: '🗑️' }
		]}
	/>
{/if}
</div>

{#if selectedAssignment}
	<AssignmentHistory bind:assignment={selectedAssignment}
		orgmap={orgmap} unitmap={unitmap} positionmap={positionmap}
		organizations={data.organizations}
		orgUnits={data.orgUnits}
		positions={data.positions}
		onSaved={() => { selectedAssignment = null; }} />
{/if}
