<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	const getActionIcon = (action: string) => {
		const icons: Record<string, string> = {
			login: '🔐',
			logout: '🚪',
			'create-user': '👤',
			'update-user': '✏️',
			'delete-user': '🗑️',
			'create-employee': '👨‍💼',
			'update-employee': '✏️',
			'delete-employee': '🗑️',
			'employee-onboard': '🎉',
			'employee-mutation': '🔄',
			'employee-offboard': '👋',
			'create-org': '🏢',
			'update-org': '🔧',
			'access-granted': '✅',
			'access-denied': '❌'
		};
		return icons[action] || '📋';
	};

	const getActionLabel = (action: string) => {
		const labels: Record<string, string> = {
			login: 'Login',
			logout: 'Logout',
			'create-user': 'Create User',
			'update-user': 'Update User',
			'delete-user': 'Delete User',
			'create-employee': 'Create Employee',
			'update-employee': 'Update Employee',
			'delete-employee': 'Delete Employee',
			'employee-onboard': 'Onboarding',
			'employee-mutation': 'Mutation',
			'employee-offboard': 'Offboarding',
			'create-org': 'Create Organization',
			'update-org': 'Update Organization',
			'access-granted': 'Access Granted',
			'access-denied': 'Access Denied'
		};
		return labels[action] || action;
	};

	const formatRelativeTime = (isoString: string) => {
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} min ago`;
		if (diffHours < 24) return `${diffHours} hr ago`;
		if (diffDays < 7) return `${diffDays} days ago`;
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	};

	const columns = [
		{
			key: 'action',
			label: 'Aksi',
			sortable: true,
			render: (value: string) => `
				<div class="flex items-center">
					<span class="text-xl mr-2">${getActionIcon(value)}</span>
					<span class="text-sm font-medium text-gray-900">${getActionLabel(value)}</span>
				</div>
			`
		},
		{
			key: 'identityInfo',
			label: 'Pengguna',
			sortable: false,
			render: (value: any) => {
				if (!value) return '<span class="text-gray-400">-</span>';
				const name = value.name || 'Unknown';
				const email = value.email ? `<div class="text-xs text-gray-500">${value.email}</div>` : '';
				const employeeId = value.employeeId ? `<div class="text-xs text-gray-400">NIK: ${value.employeeId}</div>` : '';
				return `
					<div>
						<div class="text-sm font-medium text-gray-900">${name}</div>
						${email}
						${employeeId}
					</div>
				`;
			}
		},
		{
			key: 'resource',
			label: 'Target',
			sortable: true,
			render: (value: string, row: any) => {
				if (!value) return '<span class="text-gray-400">-</span>';
				const resourceId = row.resourceId ? `<div class="text-xs text-gray-400 truncate max-w-[150px]" title="${row.resourceId}">${row.resourceId}</div>` : '';
				return `
					<div>
						<span class="text-xs bg-gray-100 px-2 py-1 rounded">${value}</span>
						${resourceId}
					</div>
				`;
			}
		},
		{
			key: 'timestamp',
			label: 'Waktu',
			sortable: true,
			render: (value: string) => `
				<div class="text-sm text-gray-900">${formatRelativeTime(value)}</div>
				<div class="text-xs text-gray-500">${new Date(value).toLocaleString('id-ID')}</div>
			`
		}
	];

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
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<p class="text-sm text-gray-500">Riwayat aktivitas sistem</p>
	</div>

	<DataTable
		data={data.auditLogs}
		{columns}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		searchPlaceholder="Search log (action, resource, ID)..."
		onPageChange={handlePageChange}
		onPageSizeChange={handlePageSizeChange}
		onSort={handleSort}
		onSearch={handleSearch}
		onEdit={(row) => goto(`/audit/${row._id}`)}
		emptyMessage="No system activity logs yet."
	/>
</div>
