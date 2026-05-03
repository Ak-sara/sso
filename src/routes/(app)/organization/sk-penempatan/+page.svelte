<script lang="ts">
import type { PageData } from './$types';
import { goto } from '$app/navigation';
import DataTable from '$lib/components/DataTable.svelte';
import PageHints from '$lib/components/PageHints.svelte';
import { navigateWithParams } from '$lib/utils/navigate';
import { getStatusBadge, getStatusLabel, formatDateID } from '$lib/services/sk-penempatan-utils';

let { data }: { data: PageData } = $props();

let showPageHints = $state(false);

const columns = [
	{
		key: 'skNumber', label: 'No. SK', sortable: true,
		render: (value: string, row: any) =>
			`<div class="text-sm font-medium text-gray-900">${value}</div>
			${row.skTitle ? `<div class="text-xs text-gray-500">${row.skTitle}</div>` : ''}`
	},
	{
		key: 'skDate', label: 'Decree Date', sortable: true,
		render: (value: any) => `<span class="text-sm text-gray-500">${formatDateID(value)}</span>`
	},
	{
		key: 'effectiveDate', label: 'Effective', sortable: true,
		render: (value: any) => `<span class="text-sm text-gray-500">${formatDateID(value)}</span>`
	},
	{
		key: 'totalReassignments', label: 'Employees', sortable: true,
		render: (value: number, row: any) =>
			`<div class="flex items-center gap-2">
				<span class="font-medium">${value}</span>
				${row.successfulReassignments > 0 ? `<span class="text-xs text-green-600">(${row.successfulReassignments} succeeded)</span>` : ''}
			</div>`
	},
	{
		key: 'status', label: 'Status', sortable: true,
		render: (value: string) =>
			`<span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(value)}">${getStatusLabel(value)}</span>`
	},
	{
		key: 'importedFromCSV', label: 'Type', sortable: false,
		render: (value: boolean, row: any) =>
			value
				? `<span class="inline-flex items-center text-green-600 text-sm" title="${row.csvFilename ?? ''}">📁 CSV Import</span>`
				: `<span class="text-gray-400 text-sm">Manual</span>`
	}
];
</script>

<div class="space-y-6">
	<DataTable
		data={data.skList}
		{columns}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		searchable={true}
		searchPlaceholder="Search decree (number, title)..."
		searchKeys={['skNumber', 'skTitle']}
		header_actions={() => [
			{ text: 'ℹ️', class: 'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer', action: () => (showPageHints = true) },
			{ text: '+ Create New Decree', class: 'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors', action: () => goto('/organization/sk-penempatan/new') }
		]}
		actions={(row) => [
			{ label: 'Detail', onClick: () => goto(`/organization/sk-penempatan/${row._id}`), class: 'text-indigo-600 hover:text-indigo-800' }
		]}
		onPageChange={(p) => navigateWithParams({ page: String(p) })}
		onPageSizeChange={(s) => navigateWithParams({ pageSize: String(s), page: '1' })}
		onSort={(e) => navigateWithParams({ sortKey: String(e.key), sortDirection: e.direction })}
		onSearch={(q) => navigateWithParams({ search: q || null, page: '1' })}
		emptyMessage="No placement decrees yet. Create a new decree to get started."
	/>
</div>

<PageHints
	bind:visible={showPageHints}
	title='About Employee Placement Decrees'
	paragraph='<p class="mt-1 text-sm text-blue-700">
		A Placement Decree (SK) is an official document for bulk employee placement changes.
		Create a new decree, add employees manually or import from CSV, then execute to update employee data.
	</p>'
/>
