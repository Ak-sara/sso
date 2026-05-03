<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { formEnhance } from '$lib/utils/form-enhance';
	import { tick } from 'svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import Input from '$lib/components/Input.svelte';
	import ReassignmentModal from './ReassignmentModal.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { downloadCSVTemplate, getStatusBadge, getStatusLabel, formatDateID } from '$lib/services/sk-penempatan-utils';

	let { data }: { data: PageData } = $props();
	const { sk, directors } = $derived(data);
	const isNew = $derived(!sk);

	let activeTab = $state<'info' | 'employees'>('info');
	let csvFile = $state<File | null>(null);
	let actReassignment: { index: number; data: any } | null = $state(null);
	let deleteFormEl: HTMLFormElement;
	let pendingDeleteIndex = $state(-1);

	let directorOptions = $derived(
		Object.fromEntries(directors.map((d: any) => [d.employeeId, `${d.fullName} - ${d.positionName}`]))
	);

	// Local editable copies for info form
	let skNumber = $state(sk?.skNumber ?? '');
	let skTitle = $state(sk?.skTitle ?? '');
	let skDate = $state(sk?.skDate ? new Date(sk.skDate).toISOString().split('T')[0] : '');
	let effectiveDate = $state(sk?.effectiveDate ? new Date(sk.effectiveDate).toISOString().split('T')[0] : '');
	let signedBy = $state(sk?.signedBy ?? '');
	let description = $state(sk?.description ?? '');

	async function handleDelete(index: number) {
		if (!confirm('Remove this employee from the decree?')) return;
		pendingDeleteIndex = index;
		await tick();
		deleteFormEl.requestSubmit();
	}

	const reassignmentColumns = [
		{ key: 'employeeId', label: 'NIK', sortable: false },
		{ key: 'employeeName', label: 'Name', sortable: false },
		{
			key: 'previousOrgUnitName', label: 'From Unit', sortable: false,
			render: (v: any) => `<span class="text-xs text-gray-600">${v ?? '-'}</span>`
		},
		{
			key: 'newOrgUnitName', label: 'To Unit', sortable: false,
			render: (v: any) => `<span class="text-xs font-medium">${v ?? '-'}</span>`
		},
		{
			key: 'newPositionName', label: 'New Position', sortable: false,
			render: (v: any) => `<span class="text-xs">${v ?? '-'}</span>`
		},
		{
			key: 'reason', label: 'Reason', sortable: false,
			render: (v: any) => `<span class="text-xs text-gray-500">${v ?? '-'}</span>`
		},
		{
			key: 'executed', label: 'Status', sortable: false,
			render: (v: boolean) => v
				? `<span class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">✓ Executed</span>`
				: `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Pending</span>`
		}
	];
</script>

<!-- Page header -->
<div class="mb-6 flex items-center justify-between">
	<div class="flex items-center gap-3">
		<a href="/organization/sk-penempatan" class="text-gray-400 hover:text-gray-600 text-sm">← SK Penempatan</a>
		<span class="text-gray-300">/</span>
		<h1 class="text-lg font-semibold text-gray-900">{isNew ? 'Create New Decree' : sk.skNumber}</h1>
		{#if !isNew && sk.skTitle}
			<span class="text-sm text-gray-500">{sk.skTitle}</span>
		{/if}
	</div>
	{#if !isNew}
		<span class="px-3 py-1 text-xs font-semibold rounded-full {getStatusBadge(sk.status)}">
			{getStatusLabel(sk.status)}
		</span>
	{/if}
</div>

<!-- Tabs (only in edit mode) -->
{#if !isNew}
<div class="border-b border-gray-200 mb-6">
	<nav class="-mb-px flex space-x-6">
		{#each [['info','📋 Decree Info'],['employees','👥 Affected Employees']] as [id, label]}
			<button type="button" onclick={() => activeTab = id as any}
				class="py-2 px-1 border-b-2 text-sm font-medium whitespace-nowrap
					{activeTab === id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
				{label}{id === 'employees' ? ` (${sk.totalReassignments ?? 0})` : ''}
			</button>
		{/each}
	</nav>
</div>
{/if}

<!-- Info tab (always shown in new mode, tab-gated in edit mode) -->
{#if activeTab === 'info' || isNew}
	
	<form method="POST" action={isNew ? '?/createSK' : '?/updateSK'}
		use:formEnhance={{ onSuccess: () => { showNotif('success', isNew ? 'Decree created' : 'Decree updated'); } }}
		class="space-y-4 bg-white border border-gray-200 rounded-lg p-6">

		<div class="grid grid-cols-2 gap-4">
			<Input type="text" name="skNumber" label="Decree No. *" bind:value={skNumber} />
			<Input type="date" name="skDate" label="Decree Date *" bind:value={skDate} />
		</div>
		<Input type="text" name="skTitle" label="Decree Title" bind:value={skTitle} />
		<div class="grid grid-cols-2 gap-4">
			<Input type="date" name="effectiveDate" label="Effective Date *" bind:value={effectiveDate} />
			<Input type="select" name="signedBy" label="Signed By *"
				bind:value={signedBy} options={directorOptions} />
		</div>
		<div>
			<label class="block text-xs font-medium text-gray-700 mt-1 ml-1 mb-1">Description</label>
			<textarea name="description" rows="3"
				class="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
				bind:value={description}></textarea>
		</div>

		<div class="flex justify-between items-center pt-2">
			<div class="text-xs text-gray-400">
				{#if !isNew && sk.importedFromCSV}
					📁 Imported from: {sk.csvFilename ?? 'CSV'}
				{/if}
			</div>
			<button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
				{isNew ? 'Create Decree' : 'Save Changes'}
			</button>
		</div>
	</form>


<!-- Employees tab (edit mode only) -->
{:else if !isNew}
	<div class="space-y-4">

		<!-- Stats -->
		{#if (sk.totalReassignments ?? 0) > 0}
			<div class="grid grid-cols-3 gap-4 max-w-sm">
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
					<p class="text-xs text-blue-600 font-medium">Total</p>
					<p class="text-xl font-bold text-blue-900">{sk.totalReassignments}</p>
				</div>
				<div class="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
					<p class="text-xs text-green-600 font-medium">Succeeded</p>
					<p class="text-xl font-bold text-green-900">{sk.successfulReassignments ?? 0}</p>
				</div>
				<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
					<p class="text-xs text-red-600 font-medium">Failed</p>
					<p class="text-xl font-bold text-red-900">{sk.failedReassignments ?? 0}</p>
				</div>
			</div>
		{/if}

		<!-- CSV Import -->
		<form method="POST" action="?/addReassignmentsCSV" enctype="multipart/form-data"
			use:formEnhance={{ onSuccess: async (data) => {
				showNotif('success', data?.message ?? 'CSV imported successfully');
				csvFile = null;
				await invalidateAll();
			} }}
			class="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
			<input type="file" name="csvFile" accept=".csv" required
				onchange={(e) => { csvFile = (e.target as HTMLInputElement).files?.[0] ?? null; }}
				class="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm" />
			<button type="button" onclick={downloadCSVTemplate}
				class="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
				📥 Template
			</button>
			<button type="submit"
				class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap">
				Import CSV
			</button>
			{#if csvFile}
				<span class="text-xs text-green-700">✓ {csvFile.name}</span>
			{/if}
		</form>

		<!-- Reassignments table -->
		<DataTable
			data={sk.reassignments ?? []}
			columns={reassignmentColumns}
			page={1}
			pageSize={(sk.reassignments?.length || 0) + 1}
			totalItems={sk.reassignments?.length ?? 0}
			searchable={false}
			header_actions={() => [
				{ text: '+ Add Manually', class: 'px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm',
					action: () => { actReassignment = { index: -1, data: null }; } }
			]}
			actions={(row) => [
				{ label: 'Edit', onClick: () => {
					const idx = (sk.reassignments ?? []).indexOf(row);
					actReassignment = { index: idx, data: row };
				}, class: 'text-indigo-600 hover:text-indigo-800' },
				{ label: 'Delete', onClick: () => {
					const idx = (sk.reassignments ?? []).indexOf(row);
					handleDelete(idx);
				}, class: 'text-red-600 hover:text-red-800' }
			]}
			emptyMessage="No affected employees yet. Add manually or import from CSV."
		/>

		<!-- Hidden delete form -->
		<form bind:this={deleteFormEl} method="POST" action="?/deleteReassignment"
			use:formEnhance={{ success: 'Employee removed', onSuccess: async () => { await invalidateAll(); } }}
			class="hidden">
			<input type="hidden" name="index" value={pendingDeleteIndex} />
		</form>
	</div>
{/if}

{#if actReassignment}
	<ReassignmentModal
		index={actReassignment.index}
		reassignment={actReassignment.data}
		onClose={() => { actReassignment = null; }}
	/>
{/if}
