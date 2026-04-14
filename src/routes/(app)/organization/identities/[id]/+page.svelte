<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { useLogger } from '$lib/logger';
	import Input  from '$lib/components/Input.svelte';
	
	import DataTable from '$lib/components/DataTable.svelte';
	import FormModal from '$lib/components/FormModal.svelte';
	import AssignmentHistory from './AssignmentHistory.svelte'
    import type { EmployeeAssignments } from '$lib/db/schemas';

	const log = useLogger({ module: 'app:identity-detail' });

	let { data }: { data: PageData } = $props();
	
	const getIdentityTypeBadge = (type: string) => {
		const badges: Record<string, { color: string; label: string }> = {
			employee: { color: 'bg-blue-100 text-blue-800', label: 'Karyawan' },
			partner: { color: 'bg-purple-100 text-purple-800', label: 'Partner' },
			external: { color: 'bg-green-100 text-green-800', label: 'External' },
			service_account: { color: 'bg-gray-100 text-gray-800', label: 'Service Account' }
		};
		return badges[type] || badges.external;
	};
	const datamap=(data:any,key:string="_id",value:string="name")=>{
		const x:Record<string,string>={};
		data.map((z:any)=>{ x[z[key]]=z[value];  })
		return x
	}

	const formatDate = (isoString: string | undefined) => {
		if (!isoString) return '-';
		try {
			return new Date(isoString).toLocaleDateString('id-ID', {
				year: 'numeric', month: 'long', day: 'numeric'
			});
		} catch { return '-'; }
	};

	const badge = $derived(getIdentityTypeBadge(data.identity?.identityType as string));

	const orgmap:Record<string,string>=datamap(data.organizations);
	const unitmap:Record<string,string>=datamap(data.orgUnits);	
	const positionmap:Record<string,string>=datamap(data.orgUnits,"code","name");	

	let showEditModal = $state(false);
	let selectedAssignment: any = $state(null);

	async function navigate(params: Record<string, string | null>) {
		const url = new URL($page.url);
		for (const [key, val] of Object.entries(params))
			val === null ? url.searchParams.delete(key) : url.searchParams.set(key, val);
		await goto(url.toString(), { keepFocus: true, noScroll: true });
		invalidate('app:pagination');
	}

	const columns = [
		{
			key: 'name', label: 'Unit Kerja', 
			render: (value: string, row: any) => `
				<div class="flex items-center">
					<span class="text-xl mr-2">${row.type}</span>
					<div>
						${value}
					</div>
				</div>`
		},
		{
			key: 'diagram', label: 'STO',
			render: (value: string) => `<code class="bg-yellow-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{
			key: 'code', label: 'Kode', 
			render: (value: string) => `<code class="bg-gray-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{
			key: 'type', label: 'Tipe',
			render: (value: string) => `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${value}</span>`
		},
		{	key: 'parentName', label: 'Parent', render: (value: string) => value },
		{ 	key: 'groupName', label: 'Member Of', render: (value: string) => value },
		{
			key: 'isActive', label: 'Status', 
			render: (value: boolean) => {
				const cls = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${cls}">${value ? 'Aktif' : 'Nonaktif'}</span>`;
			}
		}
	];
	
	async function editAssignment(aaa: EmployeeAssignments | 'new'){
		try {
			selectedAssignment=(aaa === 'new') ? {} : aaa;
			showEditModal = true;
		} catch (err) { log.error('Error loading unit', { error: err }); }
	}
	async function deleteAssignment(aaa: EmployeeAssignments){
		if (!confirm(`Apakah Anda yakin ingin menghapus unit "${aaa.employeeId}"? Tindakan ini tidak dapat dibatalkan.`)) return;
		try {
			const f = new FormData();
			f.append('code', aaa._id?.toString() as string);
			const response = await fetch('?/delete', { method: 'POST', body: f });
			const result = await response.json();
			if (result.type === 'failure') { alert(result.data?.error ?? 'Gagal menghapus'); return; }
			alert('Unit berhasil dihapus');
			await invalidateAll();
		} catch (err) { log.error('Error deleting unit', { error: err }); }
	}
	async function saveAssignment(){
		if (!selectedAssignment) return;
		const isNew = !selectedAssignment._id;
		try {
			const response = await fetch(isNew ? '?/create' : '?/update', {
				method: 'POST', body: selectedAssignment
			});
			const result = await response.json();
			if (result.type === 'failure') {
			    log.error('Error saving unit', { error: JSON.parse(result.data).splice(1).join("\n") });
				alert(JSON.parse(result.data).splice(1).join("\n") ?? 'Operation Failure');
				return;
			}
			alert(isNew ? 'Org Unit Created' : 'Successfully save changes');
			showEditModal = false;
			selectedAssignment = null;
			await invalidateAll();
		} catch (err) { log.error('Error saving unit', { error: err }); }
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
			<h1 class="text-2xl font-bold text-gray-900">
				Identity: {data.identity?.email} | {data.identity?.employeeId}
			</h1>
			<p class="text-sm text-gray-500">
				<span class="px-2 py-1 rounded text-xs font-medium {badge.color}"> {badge.label} </span>
			</p>
		</div>
	</div>
	<div class="flex space-x-2"> </div>
</div>

<!-- Main Content -->
<form method="POST" action="?/update" use:enhance>
	<input type="hidden" name="identityType" value={data.identity?.identityType} />

	<div class="bg-white shadow rounded-lg overflow-hidden">
		<!-- Basic Info -->
		<div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">Personal</h2>
			<button class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
				type="submit"> 💾 Simpan
			</button>
		</div>
		<div class="px-6 py-4 space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="grid grid-cols-[auto_1fr] gap-4 mb-2">
						<Input type="avatar" label="" style="self-center" value={data.identity?.avatar}  />
						<div>
							<!-- Username -->
							<Input type="text" label="Username" name="username" value={data.identity?.username}  />
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
				</div>
				<div>
					<!-- Active Status -->
					<Input type="checkbox" label="Active" name="isActive" value={data.identity?.isActive}  />

					<div class="grid grid-cols-[1fr_auto] gap-4">
						<!-- Email -->
						<Input type="text" label="Email" name="email" value={data.identity?.email}  />
						<Input type="checkbox" label="Verified Email" name="emailVerified" value={data.identity?.emailVerified}  />
					</div>
					<Input type="text" name="personalEmail" label="personal Email" value={data.identity?.personalEmail || ''} />
					<!-- Phone -->
					<Input type="text" label="Phone" name="phone" value={data.identity?.phone}  />

					<Input type="multi-select" label="Role" name="roles" value={data.identity?.roles} options={{
						"user":"User",
						"admin":"Admin",
						"hr":"HR",
						"manager":"Manager",
					}} />
					
					{#if data.identity?.lastLogin}
					<Input type="info" label="Last Login" value=": {formatDate(data.identity?.lastLogin)}" />
					{/if}
					<!-- Join Date -->
					<Input type="info" label="Join Date" value=": {formatDate(data.identity?.joinDate)}" />

					<Input type="info" label="Create At" value=": {formatDate(data.identity?.createdAt)}" />
					<Input type="info" label="Update At" value=": {formatDate(data.identity?.updatedAt)}" />				
				</div>
			</div>
		</div>

		<!-- Assignment -->
		{#if data.identity?.identityType === 'employee'}
			<div class="px-6 py-4 bg-gray-50 border-t border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Assignments</h2>
			</div>
			<div class="px-6 py-4 space-y-4">
				<DataTable data={data.assignments.rows}
					{columns}
					searchable={false}
					header_actions={()=>[
						{
							text: '+ Assignment',
							class: 'px-4 py-1 bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer text-white rounded-md transition-colors',
							action: ()=>{ editAssignment('new') }
						}
					]}
					onPageChange={(p) => navigate({ page: String(p) })}
					onPageSizeChange={(s) => navigate({ pageSize: String(s), page: '1' })}
					actions={(row) => [
						{ label: 'Edit',   onClick: () => editAssignment(row),   class: 'text-indigo-600 hover:text-indigo-800', icon: '✏️ ' },
						{ label: 'Delete', onClick: () => deleteAssignment(row), class: 'text-red-600 hover:text-red-800',    icon: '🗑️' }
					]}
					emptyMessage="Add new Assignment..."
					page={data.assignments.page}
					pageSize={data.assignments.pageSize}
					totalItems={data.assignments.total}
				/>				
			</div>
		{/if}

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
					<Input type="select" label="Partner Type" name="partnerType" 
						value={data.identity?.partnerType} options={{
							"vendor":"Vendor",
							"consultant":"Consultant",
							"contractor":"Contractor",
							"supplier":"Supplier", }} />

				</div>
			</div>
		{/if}

		<!-- Metadata -->
		<div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">Metadata</h2>
		</div>
		<div class="px-6 py-4">
			<div class="grid grid-cols-2 gap-4 text-sm">
				
			</div>
		</div>

	</div>
</form>
</div>
{#if showEditModal && selectedAssignment}
	<FormModal onClose={() => { showEditModal = false; selectedAssignment = null; }}
		title={selectedAssignment._id ? selectedAssignment.name : 'Tambah Assignment'}
		subtitle={selectedAssignment._id ? `Kode: ${selectedAssignment.code}` : 'create new Assignment'}>

		<AssignmentHistory bind:assignment={selectedAssignment}
			orgmap={orgmap} unitmap={unitmap} positionmap={positionmap} onSave={saveAssignment} />

	</FormModal>
{/if}
