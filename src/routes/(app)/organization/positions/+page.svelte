<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import FormModal from '$lib/components/FormModal.svelte';
	import PositionForm from './PositionForm.svelte';
	import { invalidateAll } from '$app/navigation';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:positions' });

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let showEditModal = $state(false);
	let showPageHints = $state(false);
	let selectedPosition: any = $state(null);

	function createDefaultPosition() {
		return { code: '', name: '', grade: '', level: 0, description: '', isActive: true };
	}

	// DataTable columns
	const columns = [
		{
			key: 'name',
			label: 'Position Name',
			sortable: true,
			render: (value: string, row: any) => `
				<div>
					<p class="font-medium text-gray-900">${value}</p>
					<p class="text-sm text-gray-500">Code: ${row.code}</p>
				</div>
			`
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
			const response = await fetch(`/api/positions/${position.code}`);
			if (response.ok) {
				selectedPosition = await response.json();
				showEditModal = true;
			} else {
				alert('Failed to load position data');
			}
		} catch (err) {
			log.error('Error loading position', { error: err });
			alert('Failed to load position data');
		}
	}

	async function handleDelete(position: any) {
		if (!confirm(`Delete position "${position.name}"? This action cannot be undone.`)) {
			return;
		}

		try {
			const formData = new FormData();
			formData.append('code', position.code);

			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				alert(`Failed to delete position: ${result.data.error}`);
			} else if (result.type === 'success') {
				alert('Position deleted successfully');
				await invalidateAll();
			}
		} catch (err) {
			log.error('Error deleting position', { error: err });
			alert('Failed to delete position');
		}
	}

	async function saveChanges() {
		if (!selectedPosition) return;

		try {
			if (!selectedPosition._id) {
				const formData = new FormData();
				formData.append('code', selectedPosition.code);
				formData.append('name', selectedPosition.name);
				if (selectedPosition.grade) formData.append('grade', selectedPosition.grade);
				formData.append('level', String(selectedPosition.level || 0));
				if (selectedPosition.description) formData.append('description', selectedPosition.description);

				const response = await fetch('?/create', { method: 'POST', body: formData });
				const result = await response.json();
				if (result.type === 'failure') {
					alert(`Failed to create position: ${result.data?.error}`);
					return;
				}
				alert('Position created successfully');
			} else {
				const response = await fetch(`/api/positions/${selectedPosition.code}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: selectedPosition.name,
						grade: selectedPosition.grade || '',
						level: selectedPosition.level || 0,
						description: selectedPosition.description || '',
						isActive: selectedPosition.isActive
					})
				});
				if (!response.ok) {
					const error = await response.json();
					alert(`Failed to update position: ${error.error || 'Unknown error'}`);
					return;
				}
				alert('Position updated successfully');
			}
			closeEditModal();
			await invalidateAll();
		} catch (err) {
			log.error('Error saving position', { error: err });
			alert('Failed to save position');
		}
	}

	function closeEditModal() {
		showEditModal = false;
		selectedPosition = null;
	}
</script>

<div class="space-y-6">

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
				action:() => { selectedPosition = createDefaultPosition(); showEditModal = true; }
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

{#if showEditModal && selectedPosition}
	<FormModal
		onClose={closeEditModal}
		title={selectedPosition._id ? selectedPosition.name : 'Tambah Posisi Baru'}
		subtitle={selectedPosition._id ? `Code: ${selectedPosition.code}` : 'Isi data posisi baru'}>

		<PositionForm
			bind:position={selectedPosition}
			onSave={saveChanges}
		/>

	</FormModal>
{/if}
