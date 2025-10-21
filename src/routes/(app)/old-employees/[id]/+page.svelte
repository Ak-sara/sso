<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import LinkUserModal from './link-user-modal.svelte';

	let { data }: { data: PageData } = $props();
	let activeTab = $state('overview');
	let showMutationModal = $state(false);
	let showOffboardModal = $state(false);
	let showLinkUserModal = $state(false);
	let editMode = $state(false);

	// Editable form data
	let formData = $state({
		firstName: data.employee.firstName,
		lastName: data.employee.lastName,
		email: data.employee.email,
		phone: data.employee.phone || '',
		gender: data.employee.gender || '',
		dateOfBirth: data.employee.dateOfBirth ? new Date(data.employee.dateOfBirth).toISOString().split('T')[0] : '',
		employmentType: data.employee.employmentType,
		employmentStatus: data.employee.employmentStatus,
		joinDate: data.employee.joinDate ? new Date(data.employee.joinDate).toISOString().split('T')[0] : '',
		probationEndDate: data.employee.probationEndDate ? new Date(data.employee.probationEndDate).toISOString().split('T')[0] : '',
		organizationId: data.employee.organizationId || '',
		orgUnitId: data.employee.orgUnitId || '',
		positionId: data.employee.positionId || '',
		workLocation: data.employee.workLocation || '',
		region: data.employee.region || ''
	});

	function toggleEditMode() {
		if (editMode) {
			// Reset form data if canceling
			formData = {
				firstName: data.employee.firstName,
				lastName: data.employee.lastName,
				email: data.employee.email,
				phone: data.employee.phone || '',
				gender: data.employee.gender || '',
				dateOfBirth: data.employee.dateOfBirth ? new Date(data.employee.dateOfBirth).toISOString().split('T')[0] : '',
				employmentType: data.employee.employmentType,
				employmentStatus: data.employee.employmentStatus,
				joinDate: data.employee.joinDate ? new Date(data.employee.joinDate).toISOString().split('T')[0] : '',
				probationEndDate: data.employee.probationEndDate ? new Date(data.employee.probationEndDate).toISOString().split('T')[0] : '',
				organizationId: data.employee.organizationId || '',
				orgUnitId: data.employee.orgUnitId || '',
				positionId: data.employee.positionId || '',
				workLocation: data.employee.workLocation || '',
				region: data.employee.region || ''
			};
		}
		editMode = !editMode;
	}
</script>

<div class="space-y-6">
	<!-- Header with Actions -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex items-start justify-between">
			<div class="flex items-center space-x-4">
				<div class="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
					<span class="text-3xl font-bold text-indigo-600">
						{data.employee.firstName[0]}{data.employee.lastName[0]}
					</span>
				</div>
				<div>
					<h1 class="text-2xl font-bold text-gray-900">{data.employee.fullName}</h1>
					<p class="text-gray-500">{data.employee.employeeId} • {data.employee.email}</p>
					<div class="flex items-center space-x-2 mt-2">
						<span class="px-2 py-1 text-xs font-semibold rounded-full {data.employee.employmentStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
							{data.employee.employmentStatus}
						</span>
						<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
							{data.employee.employmentType}
						</span>
					</div>
				</div>
			</div>

			<div class="flex space-x-2">
				{#if !editMode}
					<button
						onclick={() => showMutationModal = true}
						class="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50"
					>
						🔄 Mutasi/Transfer
					</button>
					<button
						onclick={() => showOffboardModal = true}
						class="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50"
					>
						🚪 Offboarding
					</button>
					<button
						onclick={toggleEditMode}
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						✏️ Edit
					</button>
				{:else}
					<button
						type="button"
						onclick={toggleEditMode}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
					>
						Batal
					</button>
					<button
						type="submit"
						form="edit-employee-form"
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						💾 Simpan Perubahan
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				onclick={() => activeTab = 'overview'}
				class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				📋 Overview
			</button>
			<button
				onclick={() => activeTab = 'assignment'}
				class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'assignment' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				🏢 Penempatan
			</button>
			<button
				onclick={() => activeTab = 'sso'}
				class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'sso' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				🔐 SSO Access
			</button>
			<button
				onclick={() => activeTab = 'history'}
				class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				📜 Riwayat
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'overview'}
		<form id="edit-employee-form" method="POST" action="?/update" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Personal Info -->
			<div class="lg:col-span-2 space-y-6">
				<div class="bg-white shadow rounded-lg p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Informasi Personal</h3>
					{#if editMode}
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Nama Depan *</label>
								<input
									type="text"
									name="firstName"
									bind:value={formData.firstName}
									required
									class="w-full px-3 py-2 border rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Nama Belakang *</label>
								<input
									type="text"
									name="lastName"
									bind:value={formData.lastName}
									required
									class="w-full px-3 py-2 border rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
								<input
									type="email"
									name="email"
									bind:value={formData.email}
									required
									class="w-full px-3 py-2 border rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
								<input
									type="tel"
									name="phone"
									bind:value={formData.phone}
									class="w-full px-3 py-2 border rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Gender</label>
								<select name="gender" bind:value={formData.gender} class="w-full px-3 py-2 border rounded-md">
									<option value="">Pilih...</option>
									<option value="male">Laki-laki</option>
									<option value="female">Perempuan</option>
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
								<input
									type="date"
									name="dateOfBirth"
									bind:value={formData.dateOfBirth}
									class="w-full px-3 py-2 border rounded-md"
								/>
							</div>
						</div>
					{:else}
						<dl class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-sm font-medium text-gray-500">Nama Lengkap</dt>
								<dd class="mt-1 text-sm text-gray-900">{data.employee.fullName}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Email</dt>
								<dd class="mt-1 text-sm text-gray-900">{data.employee.email}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Telepon</dt>
								<dd class="mt-1 text-sm text-gray-900">{data.employee.phone || '-'}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Gender</dt>
								<dd class="mt-1 text-sm text-gray-900">{data.employee.gender || '-'}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Tanggal Lahir</dt>
								<dd class="mt-1 text-sm text-gray-900">
									{data.employee.dateOfBirth ? new Date(data.employee.dateOfBirth).toLocaleDateString('id-ID') : '-'}
								</dd>
							</div>
						</dl>
					{/if}
				</div>

				<div class="bg-white shadow rounded-lg p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Informasi Kepegawaian</h3>
					{#if editMode}
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">NIK *</label>
								<input
									type="text"
									value={data.employee.employeeId}
									disabled
									class="w-full px-3 py-2 border rounded-md bg-gray-100 cursor-not-allowed"
								/>
								<p class="text-xs text-gray-500 mt-1">NIK tidak dapat diubah</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Jenis Kepegawaian *</label>
								<select name="employmentType" bind:value={formData.employmentType} class="w-full px-3 py-2 border rounded-md">
									<option value="permanent">Permanent</option>
									<option value="PKWT">PKWT</option>
									<option value="OS">Outsource (OS)</option>
									<option value="contract">Contract</option>
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Bergabung *</label>
								<input
									type="date"
									name="joinDate"
									bind:value={formData.joinDate}
									required
									class="w-full px-3 py-2 border rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Akhir Masa Probation</label>
								<input
									type="date"
									name="probationEndDate"
									bind:value={formData.probationEndDate}
									class="w-full px-3 py-2 border rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
								<select name="employmentStatus" bind:value={formData.employmentStatus} class="w-full px-3 py-2 border rounded-md">
									<option value="active">Active</option>
									<option value="inactive">Inactive</option>
									<option value="terminated">Terminated</option>
								</select>
							</div>
						</div>
					{:else}
						<dl class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-sm font-medium text-gray-500">NIK</dt>
								<dd class="mt-1 text-sm text-gray-900">{data.employee.employeeId}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Jenis Kepegawaian</dt>
								<dd class="mt-1">
									<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
										{data.employee.employmentType}
									</span>
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Tanggal Bergabung</dt>
								<dd class="mt-1 text-sm text-gray-900">
									{new Date(data.employee.joinDate).toLocaleDateString('id-ID')}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500">Status</dt>
								<dd class="mt-1">
									<span class="px-2 py-1 text-xs font-semibold rounded-full {data.employee.employmentStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
										{data.employee.employmentStatus}
									</span>
								</dd>
							</div>
							{#if data.employee.probationEndDate}
								<div>
									<dt class="text-sm font-medium text-gray-500">Akhir Masa Probation</dt>
									<dd class="mt-1 text-sm text-gray-900">
										{new Date(data.employee.probationEndDate).toLocaleDateString('id-ID')}
									</dd>
								</div>
							{/if}
						</dl>
					{/if}
				</div>
			</div>

			<!-- Quick Info Card -->
			<div class="space-y-6">
				<div class="bg-white shadow rounded-lg p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Penempatan Saat Ini</h3>
					<div class="space-y-3">
						<div>
							<p class="text-xs text-gray-500">Entitas/Realm</p>
							<p class="text-sm font-medium text-gray-900">{data.employee.organizationName || '-'}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">Unit Kerja</p>
							<p class="text-sm font-medium text-gray-900">{data.employee.orgUnitName || '-'}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">Posisi/Jabatan</p>
							<p class="text-sm font-medium text-gray-900">{data.employee.positionName || '-'}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">Lokasi Kerja</p>
							<p class="text-sm font-medium text-gray-900">{data.employee.workLocation || '-'}</p>
						</div>
					</div>
				</div>

				<div class="bg-white shadow rounded-lg p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Custom Properties</h3>
					<div class="space-y-2">
						{#if data.employee.customProperties && Object.keys(data.employee.customProperties).length > 0}
							{#each Object.entries(data.employee.customProperties) as [key, value]}
								<div class="flex justify-between text-sm">
									<span class="text-gray-500">{key}:</span>
									<span class="text-gray-900 font-medium">{value}</span>
								</div>
							{/each}
						{:else}
							<p class="text-sm text-gray-500">Tidak ada custom properties</p>
						{/if}
					</div>
				</div>
			</div>
		</form>

	{:else if activeTab === 'assignment'}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Detail Penempatan</h3>

			<!-- Current Assignment -->
			<div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<div class="flex items-center justify-between mb-2">
					<h4 class="font-medium text-blue-900">Penempatan Utama (Primary)</h4>
					<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white">Active</span>
				</div>
				<div class="grid grid-cols-2 gap-4 mt-3">
					<div>
						<p class="text-xs text-blue-700">Realm/Entitas</p>
						<p class="text-sm font-medium text-blue-900">{data.employee.organizationName}</p>
					</div>
					<div>
						<p class="text-xs text-blue-700">Unit Kerja</p>
						<p class="text-sm font-medium text-blue-900">{data.employee.orgUnitName || 'Belum ditempatkan'}</p>
					</div>
					<div>
						<p class="text-xs text-blue-700">Posisi/Jabatan</p>
						<p class="text-sm font-medium text-blue-900">{data.employee.positionName || 'Belum ada posisi'}</p>
					</div>
					<div>
						<p class="text-xs text-blue-700">Lokasi</p>
						<p class="text-sm font-medium text-blue-900">{data.employee.workLocation || '-'}</p>
					</div>
				</div>
			</div>

			<!-- Secondary Assignments -->
			<h4 class="font-medium text-gray-900 mb-3">Penempatan Sekunder (Multi-assignment)</h4>
			{#if data.employee.secondaryAssignments && data.employee.secondaryAssignments.length > 0}
				<div class="space-y-3">
					{#each data.employee.secondaryAssignments as assignment}
						<div class="p-4 border border-gray-200 rounded-lg">
							<div class="grid grid-cols-3 gap-4">
								<div>
									<p class="text-xs text-gray-500">Organisasi</p>
									<p class="text-sm font-medium">{assignment.organizationName}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500">Periode</p>
									<p class="text-sm font-medium">
										{new Date(assignment.startDate).toLocaleDateString('id-ID')}
										{#if assignment.endDate}
											- {new Date(assignment.endDate).toLocaleDateString('id-ID')}
										{:else}
											- Sekarang
										{/if}
									</p>
								</div>
								<div>
									<p class="text-xs text-gray-500">Alokasi Waktu</p>
									<p class="text-sm font-medium">{assignment.percentage || 0}%</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-gray-500 py-4">Tidak ada penempatan sekunder</p>
			{/if}

			<button class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
				+ Tambah Penempatan Sekunder
			</button>
		</div>

	{:else if activeTab === 'sso'}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">SSO Access Management</h3>

			{#if data.employee.userId}
				<div class="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium text-green-900">✓ SSO Account Active</p>
							<p class="text-sm text-green-700 mt-1">User ID: {data.employee.userId}</p>
						</div>
						<form method="POST" action="?/revokeSSO" use:enhance>
							<button type="submit" class="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50">
								Revoke Access
							</button>
						</form>
					</div>
				</div>

				<div class="space-y-4">
					<div>
						<p class="text-sm font-medium text-gray-700 mb-2">User Details</p>
						<dl class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-xs text-gray-500">Username</dt>
								<dd class="text-sm font-medium">{data.ssoUser?.username || '-'}</dd>
							</div>
							<div>
								<dt class="text-xs text-gray-500">Email</dt>
								<dd class="text-sm font-medium">{data.ssoUser?.email || '-'}</dd>
							</div>
							<div>
								<dt class="text-xs text-gray-500">Roles</dt>
								<dd class="text-sm">
									{#if data.ssoUser?.roles}
										{#each data.ssoUser.roles as role}
											<span class="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded mr-1">
												{role}
											</span>
										{/each}
									{/if}
								</dd>
							</div>
							<div>
								<dt class="text-xs text-gray-500">Last Login</dt>
								<dd class="text-sm font-medium">
									{data.ssoUser?.lastLogin ? new Date(data.ssoUser.lastLogin).toLocaleString('id-ID') : 'Never'}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			{:else}
				<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
					<p class="font-medium text-yellow-900">⚠️ No SSO Account</p>
					<p class="text-sm text-yellow-700 mt-1">Karyawan ini belum memiliki akun SSO</p>
				</div>

				<div class="flex gap-3">
					<form method="POST" action="?/createSSOAccount" class="inline">
						<button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
							+ Create New SSO Account
						</button>
					</form>

					<button
						onclick={() => showLinkUserModal = true}
						type="button"
						class="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50"
					>
						🔗 Link Existing User
					</button>
				</div>
			{/if}
		</div>

	{:else if activeTab === 'history'}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Timeline Riwayat</h3>

			{#if data.history && data.history.length > 0}
				<div class="flow-root">
					<ul class="-mb-8">
						{#each data.history as event, i}
							<li>
								<div class="relative pb-8">
									{#if i < data.history.length - 1}
										<span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
									{/if}
									<div class="relative flex space-x-3">
										<div>
											<span class="h-8 w-8 rounded-full {event.eventType === 'onboarding' ? 'bg-green-500' : event.eventType === 'mutation' || event.eventType === 'transfer' || event.eventType === 'promotion' ? 'bg-blue-500' : event.eventType === 'offboarding' ? 'bg-red-500' : 'bg-gray-500'} flex items-center justify-center ring-8 ring-white">
												<span class="text-white text-sm">
													{#if event.eventType === 'onboarding'}✓
													{:else if event.eventType === 'mutation' || event.eventType === 'transfer'}→
													{:else if event.eventType === 'promotion'}↑
													{:else if event.eventType === 'demotion'}↓
													{:else if event.eventType === 'offboarding'}✗
													{:else}•{/if}
												</span>
											</span>
										</div>
										<div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
											<div>
												<p class="text-sm text-gray-900 font-medium">
													{#if event.eventType === 'onboarding'}🎯 Onboarding
													{:else if event.eventType === 'mutation'}🔄 Mutasi
													{:else if event.eventType === 'transfer'}🔄 Transfer
													{:else if event.eventType === 'promotion'}📈 Promosi
													{:else if event.eventType === 'demotion'}📉 Demosi
													{:else if event.eventType === 'offboarding'}👋 Offboarding
													{:else}{event.eventType}{/if}
												</p>
												<div class="text-sm text-gray-500 space-y-1">
													{#if event.organizationName}
														<p>Entitas: <span class="font-medium">{event.organizationName}</span></p>
													{/if}
													{#if event.orgUnitName}
														<p>Unit: <span class="font-medium">{event.orgUnitName}</span></p>
													{/if}
													{#if event.positionName}
														<p>Posisi: <span class="font-medium">{event.positionName}</span></p>
													{/if}
													{#if event.details?.notes}
														<p class="italic">{event.details.notes}</p>
													{/if}
												</div>
											</div>
											<div class="whitespace-nowrap text-right text-sm text-gray-500">
												{new Date(event.eventDate).toLocaleDateString('id-ID')}
											</div>
										</div>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="text-center py-8">
					<p class="text-gray-500 text-sm">Belum ada riwayat assignment</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Mutation Modal -->
{#if showMutationModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => showMutationModal = false} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 z-10">
				<h3 class="text-lg font-medium mb-4">Mutasi/Transfer Karyawan</h3>
				<p class="text-sm text-gray-600 mb-6">
					Pindahkan <strong>{data.employee.fullName}</strong> ke unit kerja atau entitas lain
				</p>

				<form class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Tipe Mutasi</label>
						<select class="mt-1 block w-full px-3 py-2 border rounded-md">
							<option>Transfer Unit Kerja</option>
							<option>Transfer Entitas</option>
							<option>Promosi</option>
							<option>Demosi</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Entitas Tujuan</label>
						<select class="mt-1 block w-full px-3 py-2 border rounded-md">
							<option>IAS (Current)</option>
							<option>IASS</option>
							<option>IASG</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Unit Kerja Tujuan</label>
						<select class="mt-1 block w-full px-3 py-2 border rounded-md">
							<option value="">Pilih unit kerja...</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Posisi Baru</label>
						<select class="mt-1 block w-full px-3 py-2 border rounded-md">
							<option value="">Pilih posisi...</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Tanggal Efektif</label>
						<input type="date" class="mt-1 block w-full px-3 py-2 border rounded-md" />
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Catatan</label>
						<textarea rows="3" class="mt-1 block w-full px-3 py-2 border rounded-md"></textarea>
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button type="button" onclick={() => showMutationModal = false} class="px-4 py-2 border rounded-md">
							Batal
						</button>
						<button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
							Proses Mutasi
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<LinkUserModal
	show={showLinkUserModal}
	employeeName={data.employee.fullName}
	allUsers={data.allUsers || []}
	onClose={() => showLinkUserModal = false}
/>

<!-- Offboard Modal -->
{#if showOffboardModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => showOffboardModal = false} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-xl w-full p-6 z-10">
				<h3 class="text-lg font-medium text-red-900 mb-4">⚠️ Offboarding Karyawan</h3>
				<p class="text-sm text-gray-600 mb-6">
					Proses offboarding untuk <strong>{data.employee.fullName}</strong>
				</p>

				<form class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Alasan</label>
						<select class="mt-1 block w-full px-3 py-2 border rounded-md">
							<option>Resign</option>
							<option>Kontrak Habis</option>
							<option>Pensiun</option>
							<option>PHK</option>
							<option>Lainnya</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Tanggal Efektif</label>
						<input type="date" class="mt-1 block w-full px-3 py-2 border rounded-md" />
					</div>

					<div class="p-4 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm font-medium text-red-900 mb-2">Tindakan yang akan dilakukan:</p>
						<ul class="text-sm text-red-700 space-y-1">
							<li>✓ Nonaktifkan akun SSO (jika ada)</li>
							<li>✓ Revoke semua OAuth tokens</li>
							<li>✓ Set status employment menjadi "terminated"</li>
							<li>✓ Catat dalam audit log</li>
						</ul>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Catatan</label>
						<textarea rows="3" class="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Catatan tambahan..."></textarea>
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button type="button" onclick={() => showOffboardModal = false} class="px-4 py-2 border rounded-md">
							Batal
						</button>
						<button type="submit" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
							Konfirmasi Offboarding
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<LinkUserModal
	show={showLinkUserModal}
	employeeName={data.employee.fullName}
	allUsers={data.allUsers || []}
	onClose={() => showLinkUserModal = false}
/>
