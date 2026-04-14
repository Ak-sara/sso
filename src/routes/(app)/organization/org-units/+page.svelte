<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import FormModal from '$lib/components/FormModal.svelte';
	import OrgUnitForm from './OrgUnitForm.svelte';
	import PageHints from '$lib/components/PageHints.svelte';
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:org-units' });

	let { data }: { data: PageData } = $props();

	let showPageHints = $state(false);
	let showEditModal = $state(false);
	let selectedUnit: any = $state(null);

	// ── Helpers ──────────────────────────────────────────────────────────────

	function createDefaultUnit() {
		return {
			code: '', name: '', shortName: '', type: 'department', description: '',
			organizationId: data.organizationOptions[0]?.value || null,
			parentId: null, parentName: null,
			groupId: null, groupName: null,
			picId: null, picName: null,
			managerId: null, managerName: null,
			diagram: 'logical', isActive: true
		};
	}

	async function navigate(params: Record<string, string | null>) {
		const url = new URL($page.url);
		for (const [key, val] of Object.entries(params))
			val === null ? url.searchParams.delete(key) : url.searchParams.set(key, val);
		await goto(url.toString(), { keepFocus: true, noScroll: true });
		invalidate('app:pagination');
	}

	function unitToFormData(unit: any): FormData {
		const f = new FormData();
		const skip = new Set(['parentName', 'groupName', 'picName', 'managerName']);
		for (const [key, val] of Object.entries(unit))
			if (!skip.has(key) && val !== null && val !== undefined)
				f.append(key, String(val));
		return f;
	}

	const getTypeIcon = (type: string) => ({
		board: '👥', 
		directorate: '🏛️', 
		division: '📁',
		department: '📂', 
		section: '🏢', 
		sbu: '🏢', 
		team: '👥'
	} as Record<string, string>)[type] ?? '📋';

	// ── Table columns ─────────────────────────────────────────────────────────

	const columns = [
		{
			key: 'name', label: 'Unit Kerja', sortable: true,
			render: (value: string, row: any) => `
				<div class="flex items-center">
					<span class="text-xl mr-2">${getTypeIcon(row.type)}</span>
					<div>
						<div class="text-sm font-medium text-gray-900">${value}</div>
						${row.shortName ? `<div class="text-xs text-gray-500">${row.shortName}</div>` : ''}
					</div>
				</div>`
		},
		{
			key: 'diagram', label: 'STO', sortable: true,
			render: (value: string) => `<code class="bg-yellow-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{
			key: 'code', label: 'Kode', sortable: true,
			render: (value: string) => `<code class="bg-gray-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{
			key: 'type', label: 'Tipe', sortable: true,
			render: (value: string) => `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${value}</span>`
		},
		{	key: 'parentName', label: 'Parent', sortable: false, render: (value: string) => value },
		{ 	key: 'groupName', label: 'Member Of', sortable: false, render: (value: string) => value },
		{
			key: 'isActive', label: 'Status', sortable: true,
			render: (value: boolean) => {
				const cls = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
				return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${cls}">${value ? 'Aktif' : 'Nonaktif'}</span>`;
			}
		}
	];

	// ── CRUD handlers ─────────────────────────────────────────────────────────

	async function handleEdit(unit: any) {
		try {
			const response = await fetch(`/api/org-units/${unit._id}`);
			if (!response.ok) { alert('Failed to load unit data'); return; }
			selectedUnit = await response.json();
			showEditModal = true;
		} catch (err) {
			log.error('Error loading unit', { error: err });
			alert('Failed to load unit data');
		}
	}

	async function saveChanges() {
		if (!selectedUnit) return;
		const isNew = !selectedUnit._id;
		try {
			const response = await fetch(isNew ? '?/create' : '?/update', {
				method: 'POST',
				body: unitToFormData(selectedUnit)
			});
			const result = await response.json();
			if (result.type === 'failure') {
				alert(JSON.parse(result.data).splice(1).join("\n") ?? 'Operation Failure');
				return;
			}
			alert(isNew ? 'Org Unit Created' : 'Successfully save changes');
			showEditModal = false;
			selectedUnit = null;
			await invalidateAll();
		} catch (err) {
			log.error('Error saving unit', { error: err });
			alert('Operation Failure');
		}
	}

	async function handleDelete(unit: any) {
		if (!confirm(`Apakah Anda yakin ingin menghapus unit "${unit.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
		try {
			const f = new FormData();
			f.append('code', unit.code);
			const response = await fetch('?/delete', { method: 'POST', body: f });
			const result = await response.json();
			if (result.type === 'failure') { alert(result.data?.error ?? 'Gagal menghapus'); return; }
			alert('Unit berhasil dihapus');
			await invalidateAll();
		} catch (err) {
			log.error('Error deleting unit', { error: err });
			alert('Gagal menghapus unit');
		}
	}
</script>

<div class="space-y-6">
	<DataTable
		data={data.orgUnits}
		{columns}
		header_before="<p class='text-sm text-gray-500'>Kelola unit kerja dalam organisasi</p>"
		header_actions={()=>[
			{
				text: 'ℹ️',
				class: 'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer',
				action: () => (showPageHints = true)
			},{
				text: '+ Tambah Unit Kerja',
				class: 'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
				action: () => { selectedUnit = createDefaultUnit(); showEditModal = true; }
			}
		]}
		page={data.pagination.page}
		pageSize={data.pagination.pageSize}
		totalItems={data.pagination.total}
		searchPlaceholder="Cari unit kerja (nama, kode)..."
		searchable={true}
		searchKeys={['name', 'code', 'type']}
		onPageChange={(p) => navigate({ page: String(p) })}
		onPageSizeChange={(s) => navigate({ pageSize: String(s), page: '1' })}
		onSort={(e) => navigate({ sortKey: String(e.key), sortDirection: e.direction })}
		onSearch={(q) => navigate({ search: q || null, page: '1' })}
		actions={(row) => [
			{ label: 'Edit',   onClick: () => handleEdit(row),   class: 'text-indigo-600 hover:text-indigo-800', icon: '✏️ ' },
			{ label: 'Delete', onClick: () => handleDelete(row), class: 'text-red-600 hover:text-red-800',    icon: '🗑️' }
		]}
		emptyMessage="Belum ada unit kerja. Tambahkan unit kerja baru untuk memulai."
	/>
</div>

<PageHints
	bind:visible={showPageHints}
	title='Tentang Unit Kerja/Divisi'
	paragraph='<p class="mt-1 text-sm text-blue-700">
		Unit kerja adalah bagian dari struktur organisasi seperti Direktorat, Divisi, Departemen, Seksi, dll.
		Setiap unit memiliki hierarki dan dapat memiliki unit parent. Unit ini digunakan untuk penempatan
		karyawan dan pelaporan struktur organisasi.
	</p>'
/>

{#if showEditModal && selectedUnit}
	<FormModal
		onClose={() => { showEditModal = false; selectedUnit = null; }}
		title={selectedUnit._id ? selectedUnit.name : 'Tambah Unit Kerja'}
		subtitle={selectedUnit._id ? `Kode: ${selectedUnit.code}` : 'Isi data unit kerja baru'}>

		<OrgUnitForm
			bind:unit={selectedUnit}
			organizationOptions={data.organizationOptions}
			onSave={saveChanges}
		/>

	</FormModal>
{/if}
