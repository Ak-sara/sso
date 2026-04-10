<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import FormModal from '$lib/components/FormModal.svelte';
	import RealmForm from './RealmForm.svelte';
	import RealmBrandingForm from './RealmBrandingForm.svelte';
	import { invalidateAll } from '$app/navigation';
	import PageHints from '$lib/components/PageHints.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:realms' });

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showPageHints = $state(false);
	let showEditModal = $state(false);
	let showBrandingModal = $state(false);
	let selectedRealm: any = $state(null);

	function createDefaultRealm() {
		return {
			code: '', name: '', legalName: '', type: 'subsidiary', description: '',
			isActive: true, allowedEmailDomains: [], userCount: 0
		};
	}

	const getTypeIcon = (type: string) => {
		const icons: Record<string, string> = {
			parent: '🏛️',
			subsidiary: '🏢',
			branch: '📍'
		};
		return icons[type] || '📋';
	};

	// DataTable columns
	const columns = [
		{
			key: 'name',
			label: 'Realm Name',
			sortable: true,
			render: (value: string, row: any) => `
				<div class="flex items-center gap-2">
					<span class="text-2xl">${getTypeIcon(row.type)}</span>
					<div>
						<p class="font-medium text-gray-900">${value}</p>
						<p class="text-sm text-gray-500">Code: ${row.code}</p>
					</div>
				</div>
			`
		},
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			render: (value: string) => `
				<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
					${value}
				</span>
			`
		},
		{
			key: 'userCount',
			label: 'Users',
			sortable: true,
			render: (value: number) => `<span class="font-medium text-gray-900">${value || 0}</span>`
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

	async function handleEdit(realm: any) {
		try {
			const response = await fetch(`/api/realms/${realm.code}`);
			if (response.ok) {
				selectedRealm = await response.json();
				// Ensure allowedEmailDomains is an array
				if (!selectedRealm.allowedEmailDomains) {
					selectedRealm.allowedEmailDomains = [];
				}
				showEditModal = true;
			} else {
				alert('Failed to load realm data');
			}
		} catch (err) {
			log.error('Error loading realm', { error: err });
			alert('Failed to load realm data');
		}
	}

	async function handleBranding(realm: any) {
		try {
			const response = await fetch(`/api/realms/${realm.code}`);
			if (response.ok) {
				selectedRealm = await response.json();
				// Initialize branding if not present
				if (!selectedRealm.branding) {
					selectedRealm.branding = {
						appName: selectedRealm.name,
						primaryColor: '#4f46e5',
						secondaryColor: '#7c3aed',
						accentColor: '#06b6d4',
						backgroundColor: '#f9fafb',
						textColor: '#ffffff'
					};
				}
				showBrandingModal = true;
			} else {
				alert('Failed to load realm data');
			}
		} catch (err) {
			log.error('Error loading realm', { error: err });
			alert('Failed to load realm data');
		}
	}

	async function handleDelete(realm: any) {
		if (!confirm(`Delete realm "${realm.name}"? This action cannot be undone.`)) {
			return;
		}

		try {
			const formData = new FormData();
			formData.append('code', realm.code);

			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				alert(`Failed to delete realm: ${result.data.error}`);
			} else if (result.type === 'success') {
				alert('Realm deleted successfully');
				await invalidateAll();
			}
		} catch (err) {
			log.error('Error deleting realm', { error: err });
			alert('Failed to delete realm');
		}
	}

	async function saveChanges() {
		if (!selectedRealm) return;

		try {
			if (!selectedRealm._id) {
				const formData = new FormData();
				formData.append('name', selectedRealm.name);
				formData.append('code', selectedRealm.code);
				formData.append('type', selectedRealm.type);
				if (selectedRealm.description) formData.append('description', selectedRealm.description);

				const response = await fetch('?/create', { method: 'POST', body: formData });
				const result = await response.json();
				if (result.type === 'failure') {
					alert(`Failed to create realm: ${result.data?.error}`);
					return;
				}
				alert('Realm created successfully');
			} else {
				const response = await fetch(`/api/realms/${selectedRealm.code}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: selectedRealm.name,
						legalName: selectedRealm.legalName || selectedRealm.name,
						type: selectedRealm.type,
						description: selectedRealm.description || '',
						isActive: selectedRealm.isActive,
						allowedEmailDomains: selectedRealm.allowedEmailDomains || [],
						branding: selectedRealm.branding
					})
				});
				if (!response.ok) {
					const error = await response.json();
					alert(`Failed to update realm: ${error.error || 'Unknown error'}`);
					return;
				}
				alert('Realm updated successfully');
			}
			closeEditModal();
			await invalidateAll();
		} catch (err) {
			log.error('Error saving realm', { error: err });
			alert('Failed to save realm');
		}
	}

	function closeEditModal() {
		showEditModal = false;
		selectedRealm = null;
	}

	async function saveBranding() {
		if (!selectedRealm) return;

		try {
			const response = await fetch(`/api/realms/${selectedRealm.code}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: selectedRealm.name,
					branding: selectedRealm.branding
				})
			});

			if (response.ok) {
				alert('Branding updated successfully');
				closeBrandingModal();
				await invalidateAll();
			} else {
				const error = await response.json();
				alert(`Failed to update branding: ${error.error || 'Unknown error'}`);
			}
		} catch (err) {
			log.error('Error updating branding', { error: err });
			alert('Failed to update branding');
		}
	}

	function closeBrandingModal() {
		showBrandingModal = false;
		selectedRealm = null;
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

	<!-- Realms DataTable -->
	<DataTable
		data={data.realms}
		{columns}
		header_before="<p class='text-sm text-gray-500'>Kelola realm/tenant untuk multi-organisasi</p>"
		header_actions={()=>[
			{
				text:'ℹ️',
				class:'px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer',
				action:() => (showPageHints=true)
			},{
				text:'+ Add new Realm',
				class:'px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors',
				action:() => { selectedRealm = createDefaultRealm(); showEditModal = true; }
			},
			
		]}
		searchPlaceholder="Cari realm (nama, kode)..."
		searchable={true}
		searchKeys={['name']}
		actions={(row) => [
			{
				label: 'Edit',
				onClick: () => handleEdit(row),
				class: 'text-indigo-600 hover:text-indigo-800',
				icon: '✏️ '
			},
			{
				label: 'Branding',
				onClick: () => handleBranding(row),
				class: 'text-purple-600 hover:text-purple-800',
				icon: '🎨'
			},
			{
				label: 'Delete',
				onClick: () => handleDelete(row),
				class: 'text-red-600 hover:text-red-800',
				icon: '🗑️'
			}
		]}
		emptyMessage="Belum ada realm. Tambahkan realm baru untuk memulai."
	/>
</div>


<PageHints
	bind:visible={showPageHints}
	title='Tentang Realm'
	paragraph='<p class="mt-1 text-sm text-blue-700">
					Realm adalah konsep yang mirip dengan tenant atau workspace. Setiap realm memiliki pengguna,
					organisasi, dan konfigurasi OAuth yang terisolasi. Realm di Aksara SSO menggunakan
					<strong>Organizations</strong> sebagai basis, sehingga setiap organisasi dapat dianggap sebagai realm terpisah.
				</p>'
/>

{#if showEditModal && selectedRealm}
	<FormModal
		onClose={closeEditModal}
		title={selectedRealm._id ? selectedRealm.name : 'Buat Realm Baru'}
		subtitle={selectedRealm._id ? `Code: ${selectedRealm.code}` : 'Isi data realm baru'}>

		<RealmForm
			bind:realm={selectedRealm}
			onSave={saveChanges}
		/>

	</FormModal>
{/if}

{#if showBrandingModal && selectedRealm}
	<FormModal
		onClose={closeBrandingModal}
		title="Branding Configuration"
		subtitle={`${selectedRealm.name} (${selectedRealm.code})`}>

		<RealmBrandingForm
			bind:realm={selectedRealm}
			onSave={saveBranding}
		/>

	</FormModal>
{/if}
