<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	const columns = [
		{
			key: 'contactName',
			label: 'Partner',
			sortable: true,
			render: (value: string, row: any) => `
				<div>
					<div class="text-sm font-medium text-gray-900">${value}</div>
					<div class="text-sm text-gray-500">${row.partnerId}</div>
				</div>
			`
		},
		{
			key: 'type',
			label: 'Tipe',
			sortable: true,
			render: (value: string) =>
				`<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${value}</span>`
		},
		{
			key: 'email',
			label: 'Email',
			sortable: true
		},
		{
			key: 'companyName',
			label: 'Perusahaan',
			sortable: true,
			render: (value: string) => value || '-'
		},
		{
			key: 'isActive',
			label: 'Status',
			sortable: true,
			render: (value: boolean) => {
				const colorClass = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
				const label = value ? 'Aktif' : 'Nonaktif';
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${colorClass}">${label}</span>`;
			}
		}
	];

	function handlePageChange(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handlePageSizeChange(newPageSize: number) {
		const url = new URL($page.url);
		url.searchParams.set('pageSize', newPageSize.toString());
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSort(event: { key: string; direction: 'asc' | 'desc' }) {
		const url = new URL($page.url);
		url.searchParams.set('sortKey', event.key);
		url.searchParams.set('sortDirection', event.direction);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearch(query: string) {
		const url = new URL($page.url);
		if (query) {
			url.searchParams.set('search', query);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<p class="text-sm text-gray-500">Kelola data partner non-karyawan</p>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
			+ Tambah Partner
		</button>
	</div>

	<DataTable
		data={data.partners}
		{columns}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		showActions={true}
		searchPlaceholder="Cari partner (nama, email, perusahaan)..."
		onPageChange={handlePageChange}
		onPageSizeChange={handlePageSizeChange}
		onSort={handleSort}
		onSearch={handleSearch}
		emptyMessage="Belum ada partner. Tambahkan partner baru untuk memulai."
	>
		{#snippet actionColumn({ row })}
			<button class="text-indigo-600 hover:text-indigo-900 font-medium">Detail</button>
		{/snippet}
	</DataTable>
</div>
