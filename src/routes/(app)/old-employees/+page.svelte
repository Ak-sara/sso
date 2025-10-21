<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	// DataTable columns configuration
	const columns = [
		{
			key: 'fullName',
			label: 'Karyawan',
			sortable: true,
			render: (value: string, row: any) => `
				<div class="flex items-center">
					<div class="flex-shrink-0 h-10 w-10">
						<div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
							<span class="text-green-600 font-medium">
								${row.firstName[0]}${row.lastName[0]}
							</span>
						</div>
					</div>
					<div class="ml-4">
						<div class="text-sm font-medium text-gray-900">${value}</div>
						<div class="text-sm text-gray-500">${row.workLocation || '-'}</div>
					</div>
				</div>
			`
		},
		{
			key: 'employeeId',
			label: 'NIK',
			sortable: true
		},
		{
			key: 'email',
			label: 'Email',
			sortable: true
		},
		{
			key: 'organizationName',
			label: 'Organisasi',
			sortable: true,
			render: (value: string) => value || '-'
		},
		{
			key: 'employmentType',
			label: 'Jenis Kepegawaian',
			sortable: true,
			render: (value: string) => {
				const colors: Record<string, string> = {
					permanent: 'bg-green-100 text-green-800',
					PKWT: 'bg-yellow-100 text-yellow-800',
					OS: 'bg-gray-100 text-gray-800'
				};
				const colorClass = colors[value] || 'bg-gray-100 text-gray-800';
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${colorClass}">${value}</span>`;
			}
		},
		{
			key: 'employmentStatus',
			label: 'Status',
			sortable: true,
			render: (value: string) => {
				const isActive = value === 'active';
				const colorClass = isActive
					? 'bg-green-100 text-green-800'
					: 'bg-red-100 text-red-800';
				const label = isActive ? 'Aktif' : value;
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${colorClass}">${label}</span>`;
			}
		}
	];

	// Handle pagination changes
	function handlePageChange(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handlePageSizeChange(newPageSize: number) {
		const url = new URL($page.url);
		url.searchParams.set('pageSize', newPageSize.toString());
		url.searchParams.set('page', '1'); // Reset to page 1
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
		url.searchParams.set('page', '1'); // Reset to page 1
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
				<h3 class="text-sm font-medium text-blue-800">Tentang Data Karyawan</h3>
				<p class="mt-1 text-sm text-blue-700">
					Data karyawan mencakup informasi demografis dan kepegawaian. Karyawan dapat memiliki berbagai jenis
					kepegawaian seperti <strong>Permanent</strong>, <strong>PKWT</strong> (Perjanjian Kerja Waktu Tertentu),
					atau <strong>OS</strong> (Outsource). Data ini terpisah dari akun SSO Users dan dapat dikaitkan
					melalui <code class="bg-blue-100 px-1 rounded">userId</code>.
				</p>
			</div>
		</div>
	</div>

	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola data karyawan perusahaan</p>
		</div>
		<a
			href="/employees/onboard"
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors inline-block"
		>
			+ Tambah Karyawan
		</a>
	</div>

	<!-- Employees DataTable -->
	<DataTable
		data={data.employees}
		{columns}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		showActions={true}
		searchPlaceholder="Cari karyawan (nama, NIK, email)..."
		onPageChange={handlePageChange}
		onPageSizeChange={handlePageSizeChange}
		onSort={handleSort}
		onSearch={handleSearch}
		emptyMessage="Belum ada data karyawan. Mulai dengan menambahkan karyawan baru."
	>
		{#snippet actionColumn({ row })}
			<a href="/employees/{row._id}" class="text-indigo-600 hover:text-indigo-900 font-medium">
				Detail & Edit
			</a>
		{/snippet}
	</DataTable>
</div>
