<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { tick } from 'svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import PageHints from '$lib/components/PageHints.svelte';
	import RealmModal from './RealmModal.svelte';
	import BrandingModal from './BrandingModal.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';

	let { data }: { data: PageData } = $props();

	let showPageHints = $state(false);
	let actEdit: any = $state(null);
	let actBranding: any = $state(null);
	let deleteFormEl: HTMLFormElement;
	let pendingDeleteCode = $state('');

	async function handleDelete(realm: any) {
		if (!confirm(`Hapus realm "${realm.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
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
			key: 'type', label: 'Tipe', sortable: true,
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
				? `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aktif</span>`
				: `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Nonaktif</span>`
		}
	];
</script>

<DataTable
	data={data.realms}
	{columns}
	header_before="<p class='text-sm text-gray-500'>Kelola realm/tenant untuk multi-organisasi</p>"
	header_actions={() => [
		{ text: 'ℹ️', class: 'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer', action: () => (showPageHints = true) },
		{ text: '+ Add Realm', class: 'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
			action: () => { actEdit = { code: '', name: '', legalName: '', type: 'subsidiary', description: '', isActive: true, allowedEmailDomains: [] }; } }
	]}
	searchable={true}
	searchPlaceholder="Cari realm (nama, kode)..."
	searchKeys={['name', 'code']}
	actions={(row) => [
		{ label: 'Edit', onClick: () => { actEdit = { ...row }; }, class: 'text-indigo-600 hover:text-indigo-800' },
		{ label: 'Branding', onClick: () => { actBranding = { ...row }; }, class: 'text-purple-600 hover:text-purple-800' },
		{ label: 'Hapus', onClick: () => handleDelete(row), class: 'text-red-600 hover:text-red-800' }
	]}
	emptyMessage="Belum ada realm. Tambahkan realm baru untuk memulai."
/>

<PageHints
	bind:visible={showPageHints}
	title='Tentang Realm'
	paragraph='<p class="mt-1 text-sm text-blue-700">
		Realm adalah konsep yang mirip dengan tenant atau workspace. Setiap realm memiliki pengguna,
		organisasi, dan konfigurasi OAuth yang terisolasi.
	</p>'
/>

<!-- Hidden delete form -->
<form bind:this={deleteFormEl} method="POST" action="?/delete"
	use:enhance={() => async ({ result, update }) => {
		if (result.type === 'success') {
			showNotif('success', 'Realm berhasil dihapus');
			await invalidate('app:pagination');
		} else if (result.type === 'failure') {
			showNotif('error', (result.data as any)?.error ?? 'Gagal menghapus realm');
		}
		await update({ reset: false });
	}}
	class="hidden">
	<input type="hidden" name="code" value={pendingDeleteCode} />
</form>

{#if actEdit}
	<RealmModal bind:form={actEdit} />
{/if}
{#if actBranding}
	<BrandingModal bind:form={actBranding} />
{/if}
