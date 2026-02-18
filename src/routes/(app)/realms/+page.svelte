<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import { invalidateAll } from '$app/navigation';
	import PageHints from '$lib/components/PageHints.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showPageHints = $state(false);
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showBrandingModal = $state(false);
	let selectedRealm: any = $state(null);
	let newDomain = $state('');

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
			console.error('Error loading realm:', err);
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
			console.error('Error loading realm:', err);
			alert('Failed to load realm data');
		}
	}

	// Convert file to base64
	async function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = error => reject(error);
		});
	}

	// Handle logo upload
	async function handleLogoUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			// Validate file type
			if (!file.type.startsWith('image/')) {
				alert('Please upload an image file');
				return;
			}
			// Validate file size (max 2MB)
			if (file.size > 2 * 1024 * 1024) {
				alert('Logo file size must be less than 2MB');
				return;
			}
			try {
				selectedRealm.branding.logoBase64 = await fileToBase64(file);
			} catch (error) {
				console.error('Error uploading logo:', error);
				alert('Failed to upload logo');
			}
		}
	}


	// Handle background upload
	async function handleBackgroundUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			if (!file.type.startsWith('image/')) {
				alert('Please upload an image file');
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				alert('Background file size must be less than 5MB');
				return;
			}
			try {
				selectedRealm.branding.loginBackgroundBase64 = await fileToBase64(file);
			} catch (error) {
				console.error('Error uploading background:', error);
				alert('Failed to upload background');
			}
		}
	}

	function addDomain() {
		if (!newDomain.trim()) return;

		const trimmedDomain = newDomain.trim().toLowerCase();

		// Validate domain format (supports wildcards)
		// Allow: example.com, *.com, *.co.id
		const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
		if (!domainRegex.test(trimmedDomain)) {
			alert('Format domain tidak valid. Gunakan format: example.com atau *.com');
			return;
		}

		// Check for duplicates
		if (selectedRealm.allowedEmailDomains.includes(trimmedDomain)) {
			alert('Domain sudah ada dalam daftar');
			return;
		}

		selectedRealm.allowedEmailDomains = [...selectedRealm.allowedEmailDomains, trimmedDomain];
		newDomain = '';
	}

	function removeDomain(domain: string) {
		selectedRealm.allowedEmailDomains = selectedRealm.allowedEmailDomains.filter((d: string) => d !== domain);
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
			console.error('Error deleting realm:', err);
			alert('Failed to delete realm');
		}
	}

	async function saveChanges() {
		if (!selectedRealm) return;

		try {
			const updateData = {
				name: selectedRealm.name,
				legalName: selectedRealm.legalName || selectedRealm.name,
				type: selectedRealm.type,
				description: selectedRealm.description || '',
				isActive: selectedRealm.isActive,
				allowedEmailDomains: selectedRealm.allowedEmailDomains || [],
				branding: selectedRealm.branding
			};

			const response = await fetch(`/api/realms/${selectedRealm.code}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				alert('Realm updated successfully');
				closeEditModal();
				await invalidateAll();
			} else {
				const error = await response.json();
				alert(`Failed to update realm: ${error.error || 'Unknown error'}`);
			}
		} catch (err) {
			console.error('Error updating realm:', err);
			alert('Failed to update realm');
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
			console.error('Error updating branding:', err);
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
				action:() => (showCreateModal = true)
			},
			
		]}
		searchPlaceholder="Cari realm (nama, kode)..."
		actions={(row) => [
			{
				label: 'Edit',
				onClick: () => handleEdit(row),
				class: 'text-indigo-600 hover:text-indigo-800',
				icon: '✏️'
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
	visible={showPageHints}
	title='Tentang Realm'
	paragraph='<p class="mt-1 text-sm text-blue-700">
					Realm adalah konsep yang mirip dengan tenant atau workspace. Setiap realm memiliki pengguna,
					organisasi, dan konfigurasi OAuth yang terisolasi. Realm di Aksara SSO menggunakan
					<strong>Organizations</strong> sebagai basis, sehingga setiap organisasi dapat dianggap sebagai realm terpisah.
				</p>'
/>
<!-- Create Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => (showCreateModal = false)} class="fixed inset-0 bg-[rgba(0,0,0,0.5)]"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Buat Realm Baru</h3>

				<form method="POST" action="?/create" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Nama Realm</label>
						<input
							type="text"
							name="name"
							required
							placeholder="PT Contoh Organisasi"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Kode</label>
						<input
							type="text"
							name="code"
							required
							placeholder="CONTOH"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Tipe</label>
						<select
							name="type"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						>
							<option value="subsidiary">Subsidiary</option>
							<option value="parent">Parent</option>
							<option value="branch">Branch</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Deskripsi</label>
						<textarea
							name="description"
							rows="3"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						></textarea>
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onclick={() => (showCreateModal = false)}
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							Buat Realm
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && selectedRealm}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={closeEditModal}
	>
		<div
			class="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span class="text-4xl">{getTypeIcon(selectedRealm.type)}</span>
					<div>
						<h3 class="text-xl font-bold">{selectedRealm.name}</h3>
						<p class="text-sm text-gray-500">Code: {selectedRealm.code}</p>
					</div>
				</div>
				<button onclick={closeEditModal} class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-4">
				<!-- Code (read-only) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Kode</label>
					<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{selectedRealm.code}</p>
					<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah</p>
				</div>

				<!-- Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nama Realm</label>
					<input
						type="text"
						bind:value={selectedRealm.name}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Legal Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nama Legal</label>
					<input
						type="text"
						bind:value={selectedRealm.legalName}
						placeholder={selectedRealm.name}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<!-- Type -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
					<select
						bind:value={selectedRealm.type}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					>
						<option value="subsidiary">Subsidiary</option>
						<option value="parent">Parent</option>
						<option value="branch">Branch</option>
					</select>
				</div>

				<!-- Description -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
					<textarea
						bind:value={selectedRealm.description}
						rows="3"
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					></textarea>
				</div>

				<!-- User Count (read-only) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Pengguna</label>
					<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{selectedRealm.userCount || 0} users</p>
				</div>

				<!-- Active Status -->
				<div>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={selectedRealm.isActive}
							class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						/>
						<span class="text-sm font-medium text-gray-700">Realm Active</span>
					</label>
				</div>

				<!-- Email Domain Whitelist -->
				<div class="border-t pt-4">
					<label class="block text-sm font-medium text-gray-700 mb-1">Email Domain Whitelist</label>
					<p class="text-xs text-gray-500 mb-2">
						Domain email yang diizinkan untuk pendaftaran. Kosongkan untuk <strong>mengizinkan semua domain</strong>. Tambahkan domain untuk <strong>membatasi hanya domain tertentu</strong>.
					</p>
					<p class="text-xs text-blue-600 mb-3">
						💡 Gunakan wildcard untuk izinkan semua subdomain: <code class="bg-blue-50 px-1 rounded">*.com</code>, <code class="bg-blue-50 px-1 rounded">*.co.id</code>
					</p>

					<!-- Current domains list -->
					{#if selectedRealm.allowedEmailDomains && selectedRealm.allowedEmailDomains.length > 0}
						<div class="space-y-2 mb-3">
							{#each selectedRealm.allowedEmailDomains as domain}
								<div class="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
									<span class="flex-1 text-sm text-gray-700">@{domain}</span>
									<button
										type="button"
										onclick={() => removeDomain(domain)}
										class="text-red-600 hover:text-red-800 text-sm font-medium"
									>
										✕
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<div class="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
							<p class="text-sm text-blue-800">
								ℹ️ <strong>Tidak ada domain yang dikonfigurasi.</strong> Semua domain email diizinkan untuk pendaftaran (tidak ada pembatasan).
							</p>
						</div>
					{/if}

					<!-- Add new domain input -->
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={newDomain}
							placeholder="contoh: ias.co.id atau *.com"
							class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addDomain();
								}
							}}
						/>
						<button
							type="button"
							onclick={addDomain}
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
						>
							Tambah
						</button>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
				<button
					onclick={closeEditModal}
					class="px-4 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					onclick={saveChanges}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Branding Modal -->
{#if showBrandingModal && selectedRealm}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={closeBrandingModal}
	>
		<div
			class="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span class="text-4xl">🎨</span>
					<div>
						<h3 class="text-xl font-bold">Branding Configuration</h3>
						<p class="text-sm text-purple-100">{selectedRealm.name} ({selectedRealm.code})</p>
					</div>
				</div>
				<button onclick={closeBrandingModal} class="text-white hover:text-purple-200 text-2xl">×</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-6">
				<!-- Info -->
				<div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
					<div class="flex items-start gap-3">
						<span class="text-2xl">💡</span>
						<div class="flex-1">
							<h4 class="text-sm font-semibold text-purple-900 mb-1">Customize Your SSO Experience</h4>
							<p class="text-sm text-purple-800">
								Configure branding elements that will be displayed on login pages, emails, and user-facing SSO interfaces for this realm.
							</p>
						</div>
					</div>
				</div>

				<!-- App Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">App Name</label>
					<input
						type="text"
						bind:value={selectedRealm.branding.appName}
						placeholder={selectedRealm.name}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
					/>
					<p class="text-xs text-gray-500 mt-1">Display name shown in SSO pages and emails</p>
				</div>

				<!-- Images Section -->
				<div class="border-t pt-6">
					<h4 class="text-md font-semibold text-gray-800 mb-4">Images & Assets</h4>

					<!-- Logo Upload (also used as favicon) -->
					<div class="mb-6">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Logo <span class="text-gray-500 text-xs">(also used as favicon)</span>
						</label>
						{#if selectedRealm.branding.logoBase64}
							<div class="mb-3 p-4 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
								<img
									src={selectedRealm.branding.logoBase64}
									alt="Logo preview"
									class="h-20 w-auto object-contain mx-auto mb-2"
								/>
								<button
									type="button"
									onclick={() => (selectedRealm.branding.logoBase64 = undefined)}
									class="w-full text-xs text-red-600 hover:text-red-800 font-medium"
								>
									✕ Remove Logo
								</button>
							</div>
						{/if}
						<input
							type="file"
							accept="image/*"
							onchange={handleLogoUpload}
							class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
						/>
						<p class="text-xs text-gray-500 mt-1">PNG, JPG, SVG (max 2MB) - Will be used for both logo and favicon</p>
					</div>

					<!-- Login Background -->
					<div class="mt-6">
						<label class="block text-sm font-medium text-gray-700 mb-2">Login Background Image</label>
						{#if selectedRealm.branding.loginBackgroundBase64}
							<div class="mb-3 p-4 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
								<img
									src={selectedRealm.branding.loginBackgroundBase64}
									alt="Background preview"
									class="h-32 w-full object-cover rounded mx-auto mb-2"
								/>
								<button
									type="button"
									onclick={() => (selectedRealm.branding.loginBackgroundBase64 = undefined)}
									class="w-full text-xs text-red-600 hover:text-red-800 font-medium"
								>
									✕ Remove Background
								</button>
							</div>
						{/if}
						<input
							type="file"
							accept="image/*"
							onchange={handleBackgroundUpload}
							class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
						/>
						<p class="text-xs text-gray-500 mt-1">PNG, JPG (max 5MB, recommended 1920x1080px)</p>
					</div>
				</div>

				<!-- Colors Section -->
				<div class="border-t pt-6">
					<h4 class="text-md font-semibold text-gray-800 mb-4">Color Scheme</h4>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
							<div class="flex gap-2">
								<input
									type="color"
									bind:value={selectedRealm.branding.primaryColor}
									class="h-12 w-16 rounded border border-gray-300 cursor-pointer"
								/>
								<input
									type="text"
									bind:value={selectedRealm.branding.primaryColor}
									placeholder="#4f46e5"
									class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
								/>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
							<div class="flex gap-2">
								<input
									type="color"
									bind:value={selectedRealm.branding.secondaryColor}
									class="h-12 w-16 rounded border border-gray-300 cursor-pointer"
								/>
								<input
									type="text"
									bind:value={selectedRealm.branding.secondaryColor}
									placeholder="#7c3aed"
									class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
								/>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
							<div class="flex gap-2">
								<input
									type="color"
									bind:value={selectedRealm.branding.accentColor}
									class="h-12 w-16 rounded border border-gray-300 cursor-pointer"
								/>
								<input
									type="text"
									bind:value={selectedRealm.branding.accentColor}
									placeholder="#06b6d4"
									class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
								/>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Button Text Color</label>
							<div class="flex gap-2">
								<input
									type="color"
									bind:value={selectedRealm.branding.textColor}
									class="h-12 w-16 rounded border border-gray-300 cursor-pointer"
								/>
								<input
									type="text"
									bind:value={selectedRealm.branding.textColor}
									placeholder="#ffffff"
									class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
								/>
							</div>
						</div>
					</div>

					<!-- Color Preview -->
					<div class="mt-6 p-4 bg-gray-50 rounded-lg">
						<h5 class="text-sm font-medium text-gray-700 mb-3">Color Preview</h5>
						<div class="grid grid-cols-4 gap-3">
							<div class="text-center">
								<div
									class="h-20 rounded-lg shadow-sm mb-2 border border-gray-200"
									style="background-color: {selectedRealm.branding.primaryColor}"
								></div>
								<p class="text-xs font-medium text-gray-600">Primary</p>
							</div>
							<div class="text-center">
								<div
									class="h-20 rounded-lg shadow-sm mb-2 border border-gray-200"
									style="background-color: {selectedRealm.branding.secondaryColor}"
								></div>
								<p class="text-xs font-medium text-gray-600">Secondary</p>
							</div>
							<div class="text-center">
								<div
									class="h-20 rounded-lg shadow-sm mb-2 border border-gray-200"
									style="background-color: {selectedRealm.branding.accentColor}"
								></div>
								<p class="text-xs font-medium text-gray-600">Accent</p>
							</div>
							<div class="text-center">
								<div
									class="h-20 rounded-lg shadow-sm mb-2 flex items-center justify-center font-medium border border-gray-200"
									style="background-color: {selectedRealm.branding.primaryColor}; color: {selectedRealm.branding.textColor}"
								>
									Button
								</div>
								<p class="text-xs font-medium text-gray-600">Button</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Email Configuration -->
				<div class="border-t pt-6">
					<h4 class="text-md font-semibold text-gray-800 mb-4">Email Configuration</h4>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">From Name</label>
							<input
								type="text"
								bind:value={selectedRealm.branding.emailFromName}
								placeholder={selectedRealm.branding.appName || selectedRealm.name}
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">From Email Address</label>
							<input
								type="email"
								bind:value={selectedRealm.branding.emailFromAddress}
								placeholder="noreply@example.com"
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
							<input
								type="email"
								bind:value={selectedRealm.branding.supportEmail}
								placeholder="support@example.com"
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Support URL</label>
							<input
								type="url"
								bind:value={selectedRealm.branding.supportUrl}
								placeholder="https://support.example.com"
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
				<button
					onclick={closeBrandingModal}
					class="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
				>
					Cancel
				</button>
				<button
					onclick={saveBranding}
					class="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 font-medium shadow-sm"
				>
					💾 Save Branding
				</button>
			</div>
		</div>
	</div>
{/if}
