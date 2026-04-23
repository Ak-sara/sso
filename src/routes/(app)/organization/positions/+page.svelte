<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import PositionModal from './PositionModal.svelte';
	import { invalidate } from '$app/navigation';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:positions' });

	let { data }: { data: PageData } = $props();
	let showPageHints = $state(false);
	let actPosition: any = $state(null);

	// DataTable columns
	const columns = [
		{
			key: 'name',
			label: 'Position Name',
			sortable: true,
			render: (value: string, row: any) => `div>
				<p class="font-medium text-gray-900">${value}</p>
				<p class="text-sm text-gray-500">Code: ${row.code}</p>
			</div>`
		},
		{
			key: 'grade',
			label: 'Grade',
			sortable: true,
			render: (value: string) => value || '<span class="text-gray-400">-</span>'
		},
		{
			key: 'level',
			label: 'Level',
			sortable: true,
			render: (value: number) => `
				<span class="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
					${value}
				</span>
			`
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

	async function handleEdit(position: any) {
		try {
			const res = await fetch(`/api/positions/${position.code}`);
			if (res.ok) {
				actPosition = await res.json();
			} else {
				showNotif('error', 'Gagal memuat data posisi');
			}
		} catch (err) {
			log.error('Error loading position', { error: err });
			showNotif('error', 'Gagal memuat data posisi');
		}
	}

	async function handleDelete(position: any) {
		if (!confirm(`Hapus posisi "${position.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
		try {
			const fd = new FormData();
			fd.append('code', position.code);
			const res = await fetch('?/delete', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.type === 'failure') {
				showNotif('error', result.data.error ?? 'Gagal menghapus posisi');
			} else {
				showNotif('success', 'Posisi berhasil dihapus');
				await invalidate('app:pagination');
			}
		} catch (err) {
			log.error('Error deleting position', { error: err });
			showNotif('error', 'Gagal menghapus posisi');
		}
	}
</script>

<div class="space-y-6">
	<!-- Positions DataTable -->
	<DataTable
		header_before="<p class='text-sm text-gray-500'>Kelola data posisi/jabatan</p>"
		header_actions={()=>[
			{
				text:'ℹ️',
				class:'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer',
				action:() => (showPageHints=true)
			},{
				text:'+ Tambah Posisi',
				class:'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
				action:() => { actPosition = { code: '', name: '', grade: '', level: 0, description: '', isActive: true }; }
			},
		]}
		data={data.positions}
		{columns}
		searchPlaceholder="Cari posisi (nama, kode)..."
		searchable={true}
		searchKeys={['name','level']}
		onEdit={handleEdit}
		onDelete={handleDelete}
		emptyMessage="Belum ada posisi. Tambahkan posisi baru untuk memulai."
	/>
</div>

{#if actPosition}
	<PositionModal bind:position={actPosition} />
{/if}
