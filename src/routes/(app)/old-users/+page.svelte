<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showModal = $state(false);
	let editingUser = $state<any>(null);

	function openCreateModal() {
		editingUser = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingUser = null;
	}

	// DataTable columns
	const columns = [
		{
			key: 'firstName',
			label: 'Pengguna',
			sortable: true,
			render: (value: string, row: any) => `
				<div class="flex items-center">
					<div class="flex-shrink-0 h-10 w-10">
						<div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
							<span class="text-indigo-600 font-medium">
								${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}
							</span>
						</div>
					</div>
					<div class="ml-4">
						<div class="text-sm font-medium text-gray-900">${row.firstName} ${row.lastName || ''}</div>
						<div class="text-sm text-gray-500">@${row.username}</div>
					</div>
				</div>
			`
		},
		{
			key: 'email',
			label: 'Email',
			sortable: true
		},
		{
			key: 'roles',
			label: 'Roles',
			render: (value: string[]) => {
				return value.map(role =>
					`<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mr-1">${role}</span>`
				).join('');
			}
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
		},
		{
			key: 'createdAt',
			label: 'Bergabung',
			sortable: true,
			render: (value: string) => new Date(value).toLocaleDateString('id-ID')
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
				<h3 class="text-sm font-medium text-blue-800">Tentang SSO Users</h3>
				<p class="mt-1 text-sm text-blue-700">
					SSO Users adalah akun yang dapat login ke sistem SSO. Tidak semua karyawan memiliki akun SSO.
					User dapat memiliki berbagai roles seperti <code class="bg-blue-100 px-1 rounded">admin</code>,
					<code class="bg-blue-100 px-1 rounded">user</code>, atau <code class="bg-blue-100 px-1 rounded">hr</code>.
					Setiap user dapat terhubung dengan data karyawan melalui <strong>employeeId</strong>.
				</p>
			</div>
		</div>
	</div>

	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola akun pengguna SSO</p>
		</div>
		<button
			onclick={openCreateModal}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
		>
			+ Tambah Pengguna
		</button>
	</div>

	<!-- Alerts -->
	{#if form?.success}
		<div class="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
			{form.success}
		</div>
	{/if}

	{#if form?.error}
		<div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
			{form.error}
		</div>
	{/if}

	<!-- Users DataTable -->
	<DataTable
		data={data.users}
		{columns}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		showActions={true}
		searchPlaceholder="Cari pengguna (nama, email, username)..."
		onPageChange={handlePageChange}
		onPageSizeChange={handlePageSizeChange}
		onSort={handleSort}
		onSearch={handleSearch}
		emptyMessage="Belum ada pengguna. Tambahkan pengguna baru untuk memulai."
	>
		{#snippet actionColumn({ row })}
			<button
				type="button"
				onclick={() => {
					editingUser = row;
					showModal = true;
				}}
				class="text-indigo-600 hover:text-indigo-900 mr-3 font-medium"
			>
				Edit
			</button>
			<form method="POST" action="?/delete" use:enhance class="inline">
				<input type="hidden" name="userId" value={row._id} />
				<button type="submit" class="text-red-600 hover:text-red-900 font-medium">Hapus</button>
			</form>
		{/snippet}
	</DataTable>
</div>

<!-- Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<!-- Backdrop -->
			<button
				onclick={closeModal}
				class="fixed inset-0 bg-black bg-opacity-50"
			></button>

			<!-- Modal Content -->
			<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
				<h3 class="text-lg font-medium text-gray-900 mb-4">
					{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
				</h3>

				<form method="POST" action={editingUser ? '?/update' : '?/create'} use:enhance class="space-y-4">
					{#if editingUser}
						<input type="hidden" name="userId" value={editingUser._id} />
					{/if}
					<div>
						<label for="firstName" class="block text-sm font-medium text-gray-700">
							Nama Depan
						</label>
						<input
							type="text"
							id="firstName"
							name="firstName"
							value={editingUser?.firstName || ''}
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="lastName" class="block text-sm font-medium text-gray-700">
							Nama Belakang
						</label>
						<input
							type="text"
							id="lastName"
							name="lastName"
							value={editingUser?.lastName || ''}
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="username" class="block text-sm font-medium text-gray-700">
							Username
						</label>
						<input
							type="text"
							id="username"
							name="username"
							value={editingUser?.username || ''}
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="email" class="block text-sm font-medium text-gray-700">
							Email
						</label>
						<input
							type="email"
							id="email"
							name="email"
							value={editingUser?.email || ''}
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700">
							Password {editingUser ? '(kosongkan jika tidak ingin mengubah)' : ''}
						</label>
						<input
							type="password"
							id="password"
							name="password"
							required={!editingUser}
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onclick={closeModal}
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							Simpan
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
