<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import OrgUnitModal from './OrgUnitModal.svelte';
	import PageHints from '$lib/components/PageHints.svelte';
	import { invalidate } from '$app/navigation';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';
	import { navigateWithParams } from '$lib/utils/navigate';

	const log = useLogger({ module: 'app:org-units' });

	let { data }: { data: PageData } = $props();

	let showPageHints = $state(false);
	let actUnit: any = $state(null);

	const getTypeIcon = (type: string) => ({
		board: '👥', 
		directorate: '🏛️', 
		division: '📁',
		department: '📂', 
		section: '🏢', 
		sbu: '🏢', 
		team: '👥'
	} as Record<string, string>)[type] ?? '📋';

	// ── Table columns ─────────────────────────────────────────────────────────

	const columns = [
		{
			key: 'name', label: 'Work Unit', sortable: true,
			render: (value: string, row: any) => `
				<div class="flex items-center">
					<span class="text-xl mr-2">${getTypeIcon(row.type)}</span>
					<div>
						<div class="text-sm font-medium text-gray-900">${value}</div>
						${row.shortName ? `<div class="text-xs text-gray-500">${row.shortName}</div>` : ''}
					</div>
				</div>`
		},
		{
			key: 'diagram', label: 'STO', sortable: true,
			render: (value: string) => `<code class="bg-yellow-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{
			key: 'code', label: 'Code', sortable: true,
			render: (value: string) => `<code class="bg-gray-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{
			key: 'type', label: 'Type', sortable: true,
			render: (value: string) => `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${value}</span>`
		},
		{	key: 'parentName', label: 'Parent', sortable: false, render: (value: string) => value },
		{ 	key: 'groupName', label: 'Member Of', sortable: false, render: (value: string) => value },
		{
			key: 'isActive', label: 'Status', sortable: true,
			render: (value: boolean) => {
				const cls = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${cls}">${value ? 'Active' : 'Inactive'}</span>`;
			}
		}
	];

	// ── CRUD handlers ─────────────────────────────────────────────────────────

	async function handleEdit(unit: any) {
		try {
			const res = await fetch(`/api/org-units/${unit._id}`);
			if (!res.ok) { showNotif('error', 'Failed to load unit'); return; }
			actUnit = await res.json();
		} catch (err) {
			log.error('Error loading unit', { error: err });
			showNotif('error', 'Failed to load unit');
		}
	}

	async function handleDelete(unit: any) {
		if (!confirm(`Delete unit "${unit.name}"? This action cannot be undone.`)) return;
		try {
			const f = new FormData();
			f.append('code', unit.code);
			const res = await fetch('?/delete', { method: 'POST', body: f });
			const result = await res.json();
			if (result.type === 'failure') { showNotif('error', result.data?.error ?? 'Failed to delete'); return; }
			showNotif('success', 'Unit deleted');
			await invalidate('app:pagination');
		} catch (err) {
			log.error('Error deleting unit', { error: err });
			showNotif('error', 'Failed to delete unit');
		}
	}
</script>

<div class="space-y-6">
	<DataTable
		data={data.orgUnits}
		{columns}
		header_before="<p class='text-sm text-gray-500'>Manage work units in the organization</p>"
		header_actions={()=>[
			{
				text: 'ℹ️',
				class: 'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer',
				action: () => (showPageHints = true)
			},{
				text: '+ Add Work Unit',
				class: 'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
				action: () => { actUnit = { code: '', name: '', shortName: '', type: 'department', description: '', organizationId: data.organizationOptions[0]?.value || null, parentId: null, parentName: null, groupId: null, groupName: null, picId: null, picName: null, managerId: null, managerName: null, diagram: 'logical', isActive: true }; }
			}
		]}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		searchPlaceholder="Search work unit (name, code)..."
		searchable={true}
		searchKeys={['name', 'code', 'type']}
		onPageChange={(p) => navigateWithParams({ page: String(p) })}
		onPageSizeChange={(s) => navigateWithParams({ pageSize: String(s), page: '1' })}
		onSort={(e) => navigateWithParams({ sortKey: String(e.key), sortDirection: e.direction })}
		onSearch={(q) => navigateWithParams({ search: q || null, page: '1' })}
		actions={(row) => [
			{ label: 'Edit',   onClick: () => handleEdit(row),   class: 'text-indigo-600 hover:text-indigo-800', icon: '✏️ ' },
			{ label: 'Delete', onClick: () => handleDelete(row), class: 'text-red-600 hover:text-red-800',    icon: '🗑️' }
		]}
		emptyMessage="No work units yet. Add a new work unit to get started."
	/>
</div>

<PageHints
	bind:visible={showPageHints}
	title='About Work Units/Divisions'
	paragraph='<p class="mt-1 text-sm text-blue-700">
		Work units are parts of the org structure such as Directorates, Divisions, Departments, Sections, etc.
		Each unit has a hierarchy and can have a parent unit. Units are used for employee placement
		and org structure reporting.
	</p>'
/>

{#if actUnit}
	<OrgUnitModal bind:unit={actUnit} organizationOptions={data.organizationOptions} />
{/if}
