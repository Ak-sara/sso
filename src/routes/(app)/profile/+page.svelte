<script lang="ts">
	import type { PageData } from './$types';
	import Input from '$lib/components/Input.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import AssignmentHistory from '$lib/components/AssignmentHistory.svelte';
	import ChangeEmail from './ChangeEmail.svelte';
	import ChangePass from './ChangePass.svelte';
	import Change2FA from './Change2FA.svelte';
	import { formEnhance } from '$lib/utils/form-enhance';
	import { formatDate } from '$lib/utils/format';
	import { invalidateAll } from '$app/navigation';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:profile' });

	interface Props { data: PageData; }
	let { data }: Props = $props();
	const user = $derived(data.user);

	let actPass: any = $state(null);
	let actEmail: any = $state(null);
	let act2FA: any = $state(null);
	let selectedAssignment: any = $state(null);

	const assignmentColumns = [
		{ key: 'employeeId', label: 'NIK' },
		{
			key: 'employmentType', label: 'Tipe',
			render: (v: string) => `<span class="capitalize px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${v || '-'}</span>`
		},
		{
			key: 'employmentStatus', label: 'Status',
			render: (v: string) => {
				const c: Record<string, string> = {
					active: 'bg-green-100 text-green-800', probation: 'bg-yellow-100 text-yellow-800',
					terminated: 'bg-red-100 text-red-800', resigned: 'bg-gray-100 text-gray-800'
				};
				return `<span class="px-2 py-1 text-xs rounded-full ${c[v] || 'bg-gray-100 text-gray-800'}">${v || '-'}</span>`;
			}
		},
		{ key: 'organizationId', label: 'Organisasi', render: (v: string) => data.orgs[v] || v || '-' },
		{ key: 'orgUnitId',      label: 'Unit Kerja', render: (v: string) => data.ous[v]  || v || '-' },
		{ key: 'positionId',     label: 'Posisi',     render: (v: string) => data.pos[v]  || v || '-' },
		{ key: 'startDate', label: 'Dari',   render: (v: string) => formatDate(v) },
		{ key: 'endDate',   label: 'Sampai', render: (v: string) => formatDate(v) },
		{
			key: 'isRemote', label: 'Remote',
			render: (v: boolean) => v
				? `<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Remote</span>`
				: `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">On-Site</span>`
		}
	];

	async function deleteAssignment(a: any) {
		if (!confirm(`Hapus assignment NIK "${a.employeeId}"? Tindakan ini tidak dapat dibatalkan.`)) return;
		try {
			const f = new FormData();
			f.append('assignmentId', a._id?.toString());
			const res = await fetch('?/deleteAssignment', { method: 'POST', body: f });
			const result = await res.json();
			if (result.type === 'failure') { showNotif('error', result.data?.error ?? 'Gagal menghapus'); return; }
			showNotif('success', 'Assignment berhasil dihapus');
			await invalidateAll();
		} catch (err) { log.error('Error deleting assignment', { error: err }); }
	}
</script>

<svelte:head>
	<title>My Profile - {data.appName}</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-4">
	<!-- Profile Card -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
		<!-- Header row -->
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center space-x-4">
				<div class="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
					<span class="text-white text-2xl font-bold">
						{user?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
					</span>
				</div>
				<div>
					<h2 class="text-xl font-semibold text-gray-900">
						{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}
					</h2>
					<p class="text-sm text-gray-500">{user?.employeeId || ''} {user?.employeeId ? '·' : ''} {user?.email}</p>
					<p class="text-sm text-gray-500">{data.orgs[user?.organizationId ?? ''] || user?.organizationId || ''}</p>
					<div class="flex gap-1 mt-1">
						{#each (user?.roles ?? []) as role}
							<span class="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800">{role}</span>
						{/each}
					</div>
				</div>
			</div>
			<div class="flex gap-2 flex-wrap justify-end">
				<button class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
					onclick={() => (actPass = {})}>Change Password</button>
				<button class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
					onclick={() => (actEmail = {})}>Change Email</button>
				<button class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
					onclick={() => (act2FA = {})}>2FA</button>
			</div>
		</div>

		<!-- Personal Info Form -->
		<form method="POST" action="?/updateProfile" use:formEnhance={'Profil berhasil disimpan'}>
			<div class="flex items-center justify-between border-b border-gray-200 pb-1 mb-4">
				<p class="font-semibold text-gray-900">Informasi Pribadi</p>
				<button class="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700" type="submit">
					💾 Simpan </button>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
				<div>
					<div class="grid grid-cols-2 gap-4">
						<Input type="text" label="First Name" name="firstName" value={user?.firstName} />
						<Input type="text" label="Last Name"  name="lastName"  value={user?.lastName} />
					</div>
					<div class="grid grid-cols-[1fr_2fr] gap-4">
						<Input type="select" label="Gender" name="gender" value={user?.gender || ''} options={{ male: 'Male', female: 'Female' }} />
						<Input type="date"   label="Date of Birth" name="dateOfBirth" value={user?.dateOfBirth || ''} />
					</div>
					<Input type="text" label="Personal Email" name="personalEmail" value={user?.personalEmail || ''} />
					<Input type="text" label="Phone"          name="phone"         value={user?.phone || ''} />
				</div>
				<div>
					<Input type="text" label="ID Number / KTP" name="idNumber" value={user?.idNumber || ''} />
					<Input type="text" label="Tax ID / NPWP"   name="taxId"    value={user?.taxId || ''} />
					{#if user?.organizationId}
						<Input type="info" label="Organisasi" value={': ' + (data.orgs[user.organizationId] || user.organizationId)} />
					{/if}
					{#if user?.orgUnitId}
						<Input type="info" label="Unit Kerja" value={': ' + (data.ous[user.orgUnitId] || user.orgUnitId)} />
					{/if}
					{#if user?.positionId}
						<Input type="info" label="Posisi" value={': ' + (data.pos[user.positionId] || user.positionId)} />
					{/if}
				</div>
			</div>
		</form>
	</div>

	<!-- Assignment History -->
	{#if user?.identityType === 'employee'}
		<DataTable
			data={user?.assignments ?? []}
			columns={assignmentColumns}
			searchable={false}
			emptyMessage="Belum ada riwayat assignment"
			cssClass="bg-white rounded-lg shadow-sm border border-gray-200 p-2"
			header_before="<h2 class='ml-5 text-lg font-semibold text-gray-900'>Riwayat Assignment</h2>"
			header_actions={() => [{
				text: '+ Assignment',
				class: 'px-4 py-1 bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer text-white rounded-md transition-colors',
				action: () => { selectedAssignment = {}; }
			}]}
			actions={(row) => [
				{ label: 'Edit',   onClick: () => { selectedAssignment = row; }, class: 'text-indigo-600 hover:text-indigo-800', icon: '✏️ ' },
				{ label: 'Delete', onClick: () => deleteAssignment(row),         class: 'text-red-600 hover:text-red-800',    icon: '🗑️' }
			]}
		/>
	{/if}
</div>

{#if selectedAssignment}
	<AssignmentHistory
		bind:assignment={selectedAssignment}
		orgmap={data.orgs}
		unitmap={data.ous}
		positionmap={data.pos}
		organizations={data.organizations}
		orgUnits={data.orgUnits}
		positions={data.positions}
		onSaved={() => { selectedAssignment = null; }}
	/>
{/if}

{#if actEmail}
	<ChangeEmail {data} bind:form={actEmail} />
{/if}
{#if actPass}
	<ChangePass bind:form={actPass} />
{/if}
{#if act2FA}
	<Change2FA {data} bind:form={act2FA} />
{/if}
