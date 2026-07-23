<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import { tick } from 'svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import PageHints from '$lib/components/PageHints.svelte';
	import { formEnhance } from '$lib/utils/form-enhance';

	let { data }: { data: PageData } = $props();

	let showPageHints = $state(false);
	let deleteFormEl: HTMLFormElement;
	let pendingDeleteCode = $state('');

	async function handleDelete(realm: any) {
		if (!confirm(`Delete realm "${realm.name}"? This action cannot be undone.`)) return;
		pendingDeleteCode = realm.code;
		await tick();
		deleteFormEl.requestSubmit();
	}

	const getTypeIcon = (type: string) => ({ parent: '🏛️', subsidiary: '🏢', branch: '📍' }[type] ?? '📋');

	const columns = [
		{
			key: 'name', label: 'Realm', sortable: true,
			render: (value: string, row: any) =>
				`<div class="flex items-center gap-2">
					<span class="text-2xl">${getTypeIcon(row.type)}</span>
					<div>
						<p class="font-medium text-gray-900">${value}</p>
						<p class="text-sm text-gray-500">Code: ${row.code}</p>
					</div>
				</div>`
		},
		{
			key: 'type', label: 'Type', sortable: true,
			render: (value: string) =>
				`<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">${value}</span>`
		},
		{
			key: 'userCount', label: 'Users', sortable: true,
			render: (value: number) => `<span class="font-medium text-gray-900">${value ?? 0}</span>`
		},
		{
			key: 'isActive', label: 'Status', sortable: true,
			render: (value: boolean) => value
				? `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>`
				: `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>`
		}
	];
</script>

<DataTable
	data={data.realms}
	{columns}
	header_before="<p class='text-sm text-gray-500'>Manage realms/tenants for multi-organization</p>"
	header_actions={() => [
		{ text: 'ℹ️', class: 'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer', action: () => (showPageHints = true) },
		{ text: '+ Add Realm', class: 'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
			action: () => goto('/organization/realms/new') }
	]}
	searchable={true}
	searchPlaceholder="Search realm (name, code)..."
	searchKeys={['name', 'code']}
	onEdit={(row) => goto(`/organization/realms/${row.code}`)}
	onDelete={handleDelete}
	emptyMessage="No realms yet. Add a new realm to get started."
/>

<PageHints
	bind:visible={showPageHints}
	title='About Realms'
	paragraph='<p class="mt-1 text-sm text-blue-700">
		A realm is similar to a tenant or workspace. Each realm has isolated users,
		organizations, and OAuth configuration.
	</p>' />

<!-- Hidden delete form -->
<form bind:this={deleteFormEl} method="POST" action="?/delete" class="hidden"
	use:formEnhance={{ success: 'Realm deleted successfully', onSuccess: async () => { await invalidate('app:pagination'); } }} >
	<input type="hidden" name="code" value={pendingDeleteCode} />
</form>
