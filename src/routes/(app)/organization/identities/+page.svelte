<script lang="ts">
	import { invalidateAll, goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/components/DataTable.svelte';
	import PageHints from '$lib/components/PageHints.svelte';
	import type { PageData } from './$types';
	import type { Identity } from '$lib/db/schemas';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let showPageHints = $state(false);

	const tabs = [
		{ id: 'employee', name: 'Karyawan', icon: '👨‍💼', description: 'Employee identities' },
		{ id: 'partner', name: 'Partners', icon: '🤝', description: 'Partner/vendor identities' },
		{ id: 'external', name: 'External', icon: '🌐', description: 'External user identities' },
		{ id: 'service_account', name: 'Service Accounts', icon: '🤖', description: 'API/system accounts' }
	];

	async function switchTab(tabId: string) {
		const url = new URL($page.url);
		url.searchParams.set('tab', tabId);
		url.searchParams.set('page', '1');
		url.searchParams.delete('search');
		await goto(url.toString(), { keepFocus: true, noScroll: true });
		invalidate('app:pagination');
	}

	async function handlePageChange(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		await goto(url.toString(), { keepFocus: true, noScroll: true });
		invalidate('app:pagination');
	}

	async function handlePageSizeChange(newPageSize: number) {
		const url = new URL($page.url);
		url.searchParams.set('pageSize', newPageSize.toString());
		url.searchParams.set('page', '1');
		await goto(url.toString(), { keepFocus: true, noScroll: true });
		invalidate('app:pagination');
	}

	async function handleSort(event: { key: string | number | symbol; direction: 'asc' | 'desc' }) {
		const url = new URL($page.url);
		url.searchParams.set('sortKey', String(event.key));
		url.searchParams.set('sortDirection', event.direction);
		await goto(url.toString(), { keepFocus: true, noScroll: true });
		invalidate('app:pagination');
	}

	async function handleSearch(query: string) {
		const url = new URL($page.url);
		if (query) {
			url.searchParams.set('search', query);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('page', '1');
		await goto(url.toString(), { keepFocus: true, noScroll: true });
		invalidate('app:pagination');
	}

	function handleEdit(identity: Identity) {
		goto(`/organization/identities/${identity._id}`);
	}

	function handleCreate() {
		goto('/organization/identities/new');
	}

	async function handleDelete(identity: Identity) {
		if (!confirm(`Apakah Anda yakin ingin menghapus ${identity.fullName}? Tindakan ini tidak dapat dibatalkan.`)) {
			return;
		}

		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'identityId';
		input.value = String(identity._id);
		form.appendChild(input);

		document.body.appendChild(form);
		form.requestSubmit();
		document.body.removeChild(form);

		await invalidateAll();
	}

	// Define columns based on current tab
	let columns = $derived.by(() => {
		if (data.tab === 'employee') {
			return [
				{ key: 'employeeId', label: 'NIK', sortable: true },
				{
					key: 'fullName',
					label: 'Name',
					sortable: true,
					render: (value: string, row: Identity) =>
						`<div class="font-medium">${value}</div><div class="text-xs text-gray-500">${row.phone || '-'}</div>`
				},
				{
					key: 'email',
					label: 'Email / Username',
					sortable: true,
					render: (value: string | undefined, row: Identity) =>
						value
							? value
							: `${row.username}<span class="text-xs text-gray-500 ml-1">(NIK as username)</span>`
				},
				{
					key: 'employmentType',
					label: 'Employment Type',
					sortable: true,
					render: (value: string | undefined) => {
						const badges: Record<string, string> = {
							permanent: 'bg-blue-100 text-blue-800',
							pkwt: 'bg-yellow-100 text-yellow-800',
							outsource: 'bg-purple-100 text-purple-800',
							contract: 'bg-gray-100 text-gray-800'
						};
						const badge = badges[value || ''] || 'bg-gray-100 text-gray-800';
						return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${badge}">${(value || '-').toUpperCase()}</span>`;
					}
				},
				{
					key: 'employmentStatus',
					label: 'Status',
					sortable: true,
					render: (value: string | undefined) => {
						const badges: Record<string, string> = {
							active: 'bg-green-100 text-green-800',
							probation: 'bg-yellow-100 text-yellow-800',
							terminated: 'bg-red-100 text-red-800',
							resigned: 'bg-gray-100 text-gray-800'
						};
						const badge = badges[value || ''] || 'bg-gray-100 text-gray-800';
						return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${badge}">${value || '-'}</span>`;
					}
				},
				{
					key: 'isActive',
					label: 'Active',
					sortable: true,
					render: (value: boolean) => {
						const badge = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
						return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${badge}">${value ? 'Active' : 'Inactive'}</span>`;
					}
				}
			];
		} else if (data.tab === 'partner') {
			return [
				{
					key: 'fullName',
					label: 'Name',
					sortable: true,
					render: (value: string, row: Identity) =>
						`<div class="font-medium">${value}</div><div class="text-xs text-gray-500">${row.phone || '-'}</div>`
				},
				{ key: 'companyName', label: 'Company', sortable: true },
				{ key: 'email', label: 'Email', sortable: true },
				{ key: 'partnerType', label: 'Type', sortable: true },
				{
					key: 'contractEndDate',
					label: 'Contract End',
					sortable: true,
					render: (value: string | undefined) => {
						if (!value || value.trim() === '') return '-';
						try {
							const date = new Date(value);
							return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('id-ID');
						} catch {
							return '-';
						}
					}
				},
				{
					key: 'isActive',
					label: 'Active',
					sortable: true,
					render: (value: boolean) => {
						const badge = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
						return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${badge}">${value ? 'Active' : 'Inactive'}</span>`;
					}
				}
			];
		} else {
			return [
				{
					key: 'fullName',
					label: 'Name',
					sortable: true,
					render: (value: string, row: Identity) =>
						`<div class="font-medium">${value}</div><div class="text-xs text-gray-500">${row.phone || '-'}</div>`
				},
				{
					key: 'email',
					label: 'Email / Username',
					sortable: true,
					render: (value: string | undefined, row: Identity) => value || row.username
				},
				{
					key: 'roles',
					label: 'Roles',
					render: (value: string[]) => value.join(', ')
				},
				{
					key: 'isActive',
					label: 'Active',
					sortable: true,
					render: (value: boolean) => {
						const badge = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
						return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${badge}">${value ? 'Active' : 'Inactive'}</span>`;
					}
				}
			];
		}
	});
</script>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="md:flex md:items-center md:justify-between mb-6">
		<p class="mt-1 text-sm text-gray-500">
			Manage all identity types: employees, partners, external users, and service accounts
		</p>
	</div>

	<!-- Tabs -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="border-b border-gray-200 mb-6">
			<nav class="-mb-px flex space-x-8" aria-label="Tabs">
				{#each tabs as tab}
					<button
						type="button"
						onclick={() => switchTab(tab.id)}
						class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {data.tab === tab.id
							? 'border-indigo-500 text-indigo-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						<span class="mr-2">{tab.icon}</span>
						{tab.name}
						<span class="ml-1 text-xs text-gray-400">({data.tabCounts[tab.id] ?? 0})</span>
					</button>
				{/each}
			</nav>
		</div>

		<!-- DataTable (server-side pagination) -->
		<DataTable
			data={data.identities}
			{columns}
			page={data.pagination.page}
			pageSize={data.pagination.pageSize}
			totalItems={data.pagination.total}
			header_actions={()=>[
				{
					text:'ℹ️',
					class:'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer',
					action:() => (showPageHints=true)
				},{
					text:'+ Add Identity',
					class:'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
					action:() => {handleCreate()}
				},

			]}
			searchable={true}
			searchPlaceholder="Cari identitas (nama, email, NIK)..."
			searchKeys={['fullName', 'email', 'username', 'employeeId', 'phone', 'companyName', 'partnerType']}
			onPageChange={handlePageChange}
			onPageSizeChange={handlePageSizeChange}
			onSort={handleSort}
			onSearch={handleSearch}
			onEdit={handleEdit}
			onDelete={handleDelete}
			emptyMessage={`Tidak ada ${tabs.find(t => t.id === data.tab)?.name || 'identitas'}`}
		/>
	</div>
</div>

<PageHints
	bind:visible={showPageHints}
	title='Unified Identity Model'
	paragraph='<p>
		All users (employees, partners, external) are managed in one place.
		<strong>Employees can login with email OR NIK</strong>.
		New identities are created with <strong>isActive: true</strong> by default.
	</p>'
/>