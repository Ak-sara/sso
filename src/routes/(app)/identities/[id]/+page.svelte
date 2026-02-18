<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
	console.log(data)
	const isEditMode = $derived(data.mode === 'edit');

	const getIdentityTypeBadge = (type: string) => {
		const badges: Record<string, { color: string; label: string }> = {
			employee: { color: 'bg-blue-100 text-blue-800', label: 'Karyawan' },
			partner: { color: 'bg-purple-100 text-purple-800', label: 'Partner' },
			external: { color: 'bg-green-100 text-green-800', label: 'External' },
			service_account: { color: 'bg-gray-100 text-gray-800', label: 'Service Account' }
		};
		return badges[type] || badges.external;
	};

	const formatDate = (isoString: string | undefined) => {
		if (!isoString) return '-';
		try {
			return new Date(isoString).toLocaleDateString('id-ID', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return '-';
		}
	};

	function toggleEditMode() {
		if (isEditMode) {
			goto(`/identities/${data.identity._id}`);
		} else {
			goto(`/identities/${data.identity._id}?mode=edit`);
		}
	}

	const badge = $derived(getIdentityTypeBadge(data.identity?.identityType));
</script>

<div class="max-w-5xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<a href="/identities" class="text-gray-500 hover:text-gray-700">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">
					{isEditMode ? 'Edit' : 'Detail'} Identitas
				</h1>
				<p class="text-sm text-gray-500">
					<span class="px-2 py-1 rounded text-xs font-medium {badge.color}">
						{badge.label}
					</span>
				</p>
			</div>
		</div>
		<div class="flex space-x-2">
			<button
				type="button"
				onclick={toggleEditMode}
				class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
			>
				{isEditMode ? '❌ Batal' : '✏️ Edit'}
			</button>
		</div>
	</div>

	<!-- Main Content -->
	<form method="POST" action="?/update" use:enhance>
		<input type="hidden" name="identityType" value={data.identity?.identityType} />

		<div class="bg-white shadow rounded-lg overflow-hidden">
			<!-- Basic Info -->
			<div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Informasi Dasar</h2>
			</div>
			<div class="px-6 py-4 space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<!-- Username -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
						{#if isEditMode}
							<input
								type="text"
								name="username"
								value={data.identity?.username}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						{:else}
							<p class="text-sm text-gray-900">{data.identity?.username}</p>
						{/if}
					</div>

					<!-- Email -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
						{#if isEditMode}
							<input
								type="email"
								name="email"
								value={data.identity?.email || ''}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						{:else}
							<p class="text-sm text-gray-900">{data.identity?.email || '-'}</p>
						{/if}
					</div>

					<!-- First Name -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nama Depan</label>
						{#if isEditMode}
							<input
								type="text"
								name="firstName"
								value={data.identity?.firstName}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						{:else}
							<p class="text-sm text-gray-900">{data.identity?.firstName}</p>
						{/if}
					</div>

					<!-- Last Name -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nama Belakang</label>
						{#if isEditMode}
							<input
								type="text"
								name="lastName"
								value={data.identity?.lastName}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						{:else}
							<p class="text-sm text-gray-900">{data.identity?.lastName}</p>
						{/if}
					</div>

					<!-- Phone -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
						{#if isEditMode}
							<input
								type="text"
								name="phone"
								value={data.identity?.phone || ''}
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						{:else}
							<p class="text-sm text-gray-900">{data.identity?.phone || '-'}</p>
						{/if}
					</div>

					<!-- Organization -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Organisasi</label>
						{#if isEditMode}
							<select
								name="organizationId"
								value={data.identity?.organizationId}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							>
								{#each data.organizations as org}
									<option value={org._id}>{org.name}</option>
								{/each}
							</select>
						{:else}
							<p class="text-sm text-gray-900">
								{data.organizations.find(o => o._id === data.identity?.organizationId)?.name || '-'}
							</p>
						{/if}
					</div>

					<!-- Active Status -->
					<div class="col-span-2">
						<label class="block text-sm font-medium text-gray-700 mb-1">Status Aktif</label>
						{#if isEditMode}
							<label class="flex items-center">
								<input
									type="checkbox"
									name="isActive"
									value="true"
									checked={data.identity?.isActive}
									class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
								/>
								<span class="ml-2 text-sm text-gray-900">Aktif</span>
							</label>
						{:else}
							<span class="px-2 py-1 text-xs font-semibold rounded-full {data.identity?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{data.identity?.isActive ? 'Aktif' : 'Nonaktif'}
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Employee Specific Fields -->
			{#if data.identity?.identityType === 'employee'}
				<div class="px-6 py-4 bg-gray-50 border-t border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">Informasi Karyawan</h2>
				</div>
				<div class="px-6 py-4 space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<!-- Employee ID (NIK) -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">NIK</label>
							{#if isEditMode}
								<input
									type="text"
									name="employeeId"
									value={data.identity?.employeeId || ''}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								/>
							{:else}
								<p class="text-sm text-gray-900 font-mono">{data.identity?.employeeId || '-'}</p>
							{/if}
						</div>

						<!-- Employment Type -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Jenis Kepegawaian</label>
							{#if isEditMode}
								<select
									name="employmentType"
									value={data.identity?.employmentType}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								>
									<option value="permanent">Permanent</option>
									<option value="pkwt">PKWT</option>
									<option value="outsource">Outsource</option>
									<option value="contract">Contract</option>
								</select>
							{:else}
								<p class="text-sm text-gray-900">{data.identity?.employmentType?.toUpperCase() || '-'}</p>
							{/if}
						</div>

						<!-- Employment Status -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Status Kepegawaian</label>
							{#if isEditMode}
								<select
									name="employmentStatus"
									value={data.identity?.employmentStatus}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								>
									<option value="active">Active</option>
									<option value="probation">Probation</option>
									<option value="terminated">Terminated</option>
									<option value="resigned">Resigned</option>
								</select>
							{:else}
								<p class="text-sm text-gray-900">{data.identity?.employmentStatus || '-'}</p>
							{/if}
						</div>

						<!-- Org Unit -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Unit Organisasi</label>
							{#if isEditMode}
								<select
									name="orgUnitId"
									value={data.identity?.orgUnitId || ''}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								>
									<option value="">- Pilih Unit -</option>
									{#each data.orgUnits as unit}
										<option value={unit._id}>{unit.name}</option>
									{/each}
								</select>
							{:else}
								<p class="text-sm text-gray-900">
									{data.orgUnits.find(u => u._id === data.identity?.orgUnitId)?.name || '-'}
								</p>
							{/if}
						</div>

						<!-- Position -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Posisi</label>
							{#if isEditMode}
								<select
									name="positionId"
									value={data.identity?.positionId || ''}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								>
									<option value="">- Pilih Posisi -</option>
									{#each data.positions as position}
										<option value={position._id}>{position.name}</option>
									{/each}
								</select>
							{:else}
								<p class="text-sm text-gray-900">
									{data.positions.find(p => p._id === data.identity?.positionId)?.name || '-'}
								</p>
							{/if}
						</div>

						<!-- Work Location -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Lokasi Kerja</label>
							{#if isEditMode}
								<input
									type="text"
									name="workLocation"
									value={data.identity?.workLocation || ''}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								/>
							{:else}
								<p class="text-sm text-gray-900">{data.identity?.workLocation || '-'}</p>
							{/if}
						</div>

						<!-- Join Date -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Bergabung</label>
							<p class="text-sm text-gray-900">{formatDate(data.identity?.joinDate)}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Partner Specific Fields -->
			{#if data.identity?.identityType === 'partner'}
				<div class="px-6 py-4 bg-gray-50 border-t border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">Informasi Partner</h2>
				</div>
				<div class="px-6 py-4 space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<!-- Company Name -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
							{#if isEditMode}
								<input
									type="text"
									name="companyName"
									value={data.identity?.companyName || ''}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								/>
							{:else}
								<p class="text-sm text-gray-900">{data.identity?.companyName || '-'}</p>
							{/if}
						</div>

						<!-- Partner Type -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Tipe Partner</label>
							{#if isEditMode}
								<select
									name="partnerType"
									value={data.identity?.partnerType}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								>
									<option value="vendor">Vendor</option>
									<option value="consultant">Consultant</option>
									<option value="contractor">Contractor</option>
									<option value="supplier">Supplier</option>
								</select>
							{:else}
								<p class="text-sm text-gray-900">{data.identity?.partnerType || '-'}</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Metadata -->
			<div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Metadata</h2>
			</div>
			<div class="px-6 py-4">
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="font-medium text-gray-500">Dibuat:</span>
						<span class="text-gray-900 ml-2">{formatDate(data.identity?.createdAt)}</span>
					</div>
					<div>
						<span class="font-medium text-gray-500">Diperbarui:</span>
						<span class="text-gray-900 ml-2">{formatDate(data.identity?.updatedAt)}</span>
					</div>
					{#if data.identity?.lastLogin}
						<div>
							<span class="font-medium text-gray-500">Login Terakhir:</span>
							<span class="text-gray-900 ml-2">{formatDate(data.identity?.lastLogin)}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Actions (only in edit mode) -->
			{#if isEditMode}
				<div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
					<button
						type="button"
						onclick={toggleEditMode}
						class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
					>
						💾 Simpan
					</button>
				</div>
			{/if}
		</div>
	</form>
</div>
