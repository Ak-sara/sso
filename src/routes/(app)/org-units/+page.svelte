<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	const getTypeIcon = (type: string) => {
		const icons: Record<string, string> = {
			board: '🏛️',
			directorate: '👔',
			division: '📁',
			department: '📂',
			section: '📄',
			sbu: '🏢',
			team: '👥'
		};
		return icons[type] || '📋';
	};

	const columns = [
		{
			key: 'name',
			label: 'Unit Kerja',
			sortable: true,
			render: (value: string, row: any) => `
				<div class="flex items-center">
					<span class="text-xl mr-2">${getTypeIcon(row.type)}</span>
					<div>
						<div class="text-sm font-medium text-gray-900" style="margin-left: ${row.level * 20}px">
							${value}
						</div>
						${row.shortName ? `<div class="text-xs text-gray-500">${row.shortName}</div>` : ''}
					</div>
				</div>
			`
		},
		{
			key: 'code',
			label: 'Kode',
			sortable: true,
			render: (value: string) => `<code class="bg-gray-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{
			key: 'type',
			label: 'Tipe',
			sortable: true,
			render: (value: string) =>
				`<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${value}</span>`
		},
		{
			key: 'level',
			label: 'Level',
			sortable: true,
			render: (value: number) => `Level ${value}`
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
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang Unit Kerja/Divisi</h3>
				<p class="mt-1 text-sm text-blue-700">
					Unit kerja adalah bagian dari struktur organisasi seperti Direktorat, Divisi, Departemen, Seksi, dll.
					Setiap unit memiliki hierarki dan dapat memiliki unit parent. Unit ini digunakan untuk penempatan
					karyawan dan pelaporan struktur organisasi.
				</p>
			</div>
		</div>
	</div>

	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola unit kerja dalam organisasi</p>
		</div>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
			+ Tambah Unit Kerja
		</button>
	</div>

	<!-- Org Units DataTable -->
	<DataTable
		data={data.orgUnits}
		{columns}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		showActions={true}
		searchPlaceholder="Cari unit kerja (nama, kode)..."
		onPageChange={handlePageChange}
		onPageSizeChange={handlePageSizeChange}
		onSort={handleSort}
		onSearch={handleSearch}
		emptyMessage="Belum ada unit kerja. Tambahkan unit kerja baru untuk memulai."
	>
		{#snippet actionColumn({ row })}
			<button class="text-indigo-600 hover:text-indigo-900 mr-3 font-medium">Edit</button>
			<button class="text-blue-600 hover:text-blue-900 font-medium">Detail</button>
		{/snippet}
	</DataTable>
</div>
