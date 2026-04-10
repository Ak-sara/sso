<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { useLogger } from '$lib/logger';
	import Input  from '$lib/components/Input.svelte';

	const log = useLogger({ module: 'app:identity-detail' });

	let { data }: { data: PageData } = $props();
	log.debug('Identity detail data loaded');
	const isEditMode = true;

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
				year: 'numeric', month: 'long', day: 'numeric'
			});
		} catch { return '-'; }
	};

	const badge = $derived(getIdentityTypeBadge(data.identity?.identityType));
	const orgmap:Record<string,string>={};
	data.organizations.map((x:any)=>{ orgmap[x._id]=x.name; })
</script>

<div class="max-w-7xl mx-auto">
<!-- Header -->
<div class="flex items-center justify-between mb-1">
	<div class="flex items-center space-x-4">
		<a href="/organization/identities" class="text-gray-500 hover:text-gray-700">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<div>
			<h1 class="text-2xl font-bold text-gray-900">
				Identity: {data.identity?.email} | {data.identity?.employeeId}
			</h1>
			<p class="text-sm text-gray-500">
				<span class="px-2 py-1 rounded text-xs font-medium {badge.color}"> {badge.label} </span>
			</p>
		</div>
	</div>
	<div class="flex space-x-2">
		<button class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
			type="button" onclick={()=>alert('')} >
			💾 Save
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
				<div>
					<!-- Username -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
						<input class="w-full px-3 py-2 border border-gray-300 rounded-md"
							type="text" name="username"
							value={data.identity?.username} required />
					</div>

					<!-- Email -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
						<input class="w-full px-3 py-2 border border-gray-300 rounded-md"
							type="email" name="email"
							value={data.identity?.email || ''}/>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<!-- First Name -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Nama Depan</label>
							<input class="w-full px-3 py-2 border border-gray-300 rounded-md"
								type="text" name="firstName"
								value={data.identity?.firstName} required />
						</div>

						<!-- Last Name -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Nama Belakang</label>
							<input class="w-full px-3 py-2 border border-gray-300 rounded-md"
								type="text" name="lastName"
								value={data.identity?.lastName} required />
						</div>
					</div>
					
					<!-- Phone -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
						<input class="w-full px-3 py-2 border border-gray-300 rounded-md"
							type="text" name="phone"
							value={data.identity?.phone || ''} />
					</div>
					<!-- avatar: z.string().url().optional() -->
				</div>
				<div>
					<!-- Active Status -->
					<div>
						<span class="font-medium text-gray-500">Active</span>
						<span class="text-gray-900 ml-2">
							<input class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
								type="checkbox" name="isActive"
								checked={data.identity?.isActive}/>
							<span class="ml-2 text-sm text-gray-900">Active</span>
						</span>
					</div>
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
					<div>
						<span class="font-medium text-gray-500">Email Verified</span>
						<span class="text-gray-900 ml-2">
							<input class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
								type="checkbox" name="emailVerified"
								checked={data.identity?.emailVerified} readonly />
							<span class="ml-2 text-sm text-gray-900">Verified</span>
						</span>
					</div>
					<div>
						<span class="font-medium text-gray-500">roles: *user, admin, hr, manager, etc</span>
						<span class="text-gray-900 ml-2">{JSON.stringify(data.identity?.roles)}</span>
					</div>
					<!-- Join Date -->
					<div>
						<span class="font-medium text-gray-500">Tanggal Bergabung</span>
						<span class="text-gray-900 ml-2">{formatDate(data.identity?.joinDate)}</span>
					</div>
					<!-- // Demographics -->
					<!-- dateOfBirth: z.date().optional(), -->
					<!-- gender: z.enum(['male', 'female', 'other']).optional(), -->
					<!-- idNumber: z.string().optional(), // KTP -->
					<!-- taxId: z.string().optional(), // NPWP -->
					<!-- personalEmail: z.string().email().optional(), -->
					
				</div>

				<!-- Organization -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Organisasi</label>
					<select class="w-full px-3 py-2 border border-gray-300 rounded-md"
						name="organizationId"
						value={data.identity?.organizationId} required >
						{#each data.organizations as org}
							<option value={org._id}>{org.name}</option>
						{/each}
					</select>
				</div>
				<Input type="select" label="Organization" name="organizationId" value={data.identity?.organizationId} options={orgmap} />
				
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
						<input class="w-full px-3 py-2 border border-gray-300 rounded-md"
							type="text" name="employeeId"
							value={data.identity?.employeeId || ''} required />
					</div>
					<Input type="text" name="employeeId" label="NIK" value={data.identity?.employeeId || ''} />
					<!-- Employment Type -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Jenis Kepegawaian</label>
						<select class="w-full px-3 py-2 border border-gray-300 rounded-md"
							name="employmentType"
							value={data.identity?.employmentType} >
							<option value="permanent">Permanent</option>
							<option value="pkwt">PKWT</option>
							<option value="outsource">Outsource</option>
							<option value="contract">Contract</option>
						</select>
					</div>

					<!-- Employment Status -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Status Kepegawaian</label>
						<select class="w-full px-3 py-2 border border-gray-300 rounded-md"
							name="employmentStatus"
							value={data.identity?.employmentStatus} >
							<option value="active">Active</option>
							<option value="probation">Probation</option>
							<option value="terminated">Terminated</option>
							<option value="resigned">Resigned</option>
						</select>
					</div>

					<!-- Org Unit -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Unit Organisasi</label>
						<select class="w-full px-3 py-2 border border-gray-300 rounded-md"
							name="orgUnitId"
							value={data.identity?.orgUnitId || ''} >
							<option value="">- Pilih Unit -</option>
							{#each data.orgUnits as unit}
								<option value={unit._id}>{unit.name}</option>
							{/each}
						</select>
					</div>

					<!-- Position -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Posisi</label>
						<select class="w-full px-3 py-2 border border-gray-300 rounded-md"
							name="positionId"
							value={data.identity?.positionId || ''} >
							<option value="">- Pilih Posisi -</option>
							{#each data.positions as position}
								<option value={position._id}>{position.name}</option>
							{/each}
						</select>
					</div>

					<!-- Work Location -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Lokasi Kerja</label>
						<input class="w-full px-3 py-2 border border-gray-300 rounded-md"
							type="text"
							name="workLocation" value={data.identity?.workLocation || ''} />
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
						<input class="w-full px-3 py-2 border border-gray-300 rounded-md"
							type="text" name="companyName"
							value={data.identity?.companyName || ''} />
					</div>

					<!-- Partner Type -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Tipe Partner</label>
						<select class="w-full px-3 py-2 border border-gray-300 rounded-md"
							name="partnerType"
							value={data.identity?.partnerType} >
							<option value="vendor">Vendor</option>
							<option value="consultant">Consultant</option>
							<option value="contractor">Contractor</option>
							<option value="supplier">Supplier</option>
						</select>
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
				
			</div>
		</div>

		<!-- Actions (only in edit mode) -->
		{#if isEditMode}
			<div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
				<button class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
					type="submit">
					💾 Simpan
				</button>
			</div>
		{/if}
	</div>
</form>
</div>
