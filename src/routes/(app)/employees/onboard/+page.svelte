<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let step = $state(1);
	let submitting = $state(false);
	let formData = $state({
		// Personal Info
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		gender: '',
		dateOfBirth: '',

		// Employment Info
		employeeId: '',
		employmentType: 'permanent',
		joinDate: '',
		probationEndDate: '',

		// Assignment
		organizationId: '',
		orgUnitId: '',
		positionId: '',
		workLocation: '',
		region: '',

		// SSO Access
		createSSOAccount: false,
		username: '',
		password: '',
		roles: ['user'],

		// Custom Properties
		customProperties: {}
	});

	function nextStep() {
		if (step < 5) step++;
	}

	function prevStep() {
		if (step > 1) step--;
	}

	function handleSubmit(event: Event) {
		submitting = true;
	}

</script>
<div class="max-w-4xl mx-auto space-y-6">
	<!-- Error Display -->
	{#if form?.error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-800 text-sm">❌ {form.error}</p>
		</div>
	{/if}

	<form method="POST" onsubmit={handleSubmit}>
		<!-- Progress Bar -->
		<div class="bg-white shadow rounded-lg p-6">
		<h2 class="text-2xl font-bold text-gray-900 mb-6">🎯 Onboarding Karyawan Baru</h2>

		<div class="mb-8">
			<div class="flex items-center justify-between mb-2">
				{#each [1,2,3,4,5] as i}
					<div class="flex-1 relative">
						<div class="w-full h-2 {i < step ? 'bg-indigo-600' : i === step ? 'bg-indigo-400' : 'bg-gray-200'} rounded-full"></div>
						<div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center {i <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'} font-bold">
							{i}
						</div>
					</div>
				{/each}
			</div>
			<div class="flex justify-between text-xs text-gray-500 mt-6">
				<span>Personal</span>
				<span>Employment</span>
				<span>Penempatan</span>
				<span>SSO Access</span>
				<span>Review</span>
			</div>
		</div>
	</div>

	<!-- Step Content -->
	<div class="bg-white shadow rounded-lg p-6">
		{#if step === 1}
			<!-- Personal Information -->
			<h3 class="text-lg font-medium mb-4">📋 Informasi Personal</h3>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Nama Depan *</label>
					<input type="text" bind:value={formData.firstName} required class="w-full px-3 py-2 border rounded-md" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Nama Belakang *</label>
					<input type="text" bind:value={formData.lastName} required class="w-full px-3 py-2 border rounded-md" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
					<input type="email" bind:value={formData.email} required class="w-full px-3 py-2 border rounded-md" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
					<input type="tel" bind:value={formData.phone} class="w-full px-3 py-2 border rounded-md" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Gender</label>
					<select bind:value={formData.gender} class="w-full px-3 py-2 border rounded-md">
						<option value="">Pilih...</option>
						<option value="male">Laki-laki</option>
						<option value="female">Perempuan</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
					<input type="date" bind:value={formData.dateOfBirth} class="w-full px-3 py-2 border rounded-md" />
				</div>
			</div>

		{:else if step === 2}
			<!-- Employment Information -->
			<h3 class="text-lg font-medium mb-4">💼 Informasi Kepegawaian</h3>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">NIP/Employee ID *</label>
					<input type="text" bind:value={formData.employeeId} required class="w-full px-3 py-2 border rounded-md" placeholder="IAS-001" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Jenis Kepegawaian *</label>
					<select bind:value={formData.employmentType} class="w-full px-3 py-2 border rounded-md">
						<option value="permanent">Permanent</option>
						<option value="PKWT">PKWT</option>
						<option value="OS">Outsource (OS)</option>
						<option value="contract">Contract</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Bergabung *</label>
					<input type="date" bind:value={formData.joinDate} required class="w-full px-3 py-2 border rounded-md" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Akhir Masa Probation</label>
					<input type="date" bind:value={formData.probationEndDate} class="w-full px-3 py-2 border rounded-md" />
				</div>
			</div>

			{#if formData.employmentType === 'PKWT'}
				<div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<p class="text-sm text-yellow-800">
						⚠️ Untuk PKWT, jangan lupa set tanggal akhir kontrak setelah onboarding selesai
					</p>
				</div>
			{/if}

		{:else if step === 3}
			<!-- Assignment -->
			<h3 class="text-lg font-medium mb-4">🏢 Penempatan</h3>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Realm/Entitas *</label>
					<select bind:value={formData.organizationId} class="w-full px-3 py-2 border rounded-md">
						<option value="">Pilih entitas...</option>
						<option value="ias">IAS - Injourney Aviation Service</option>
						<option value="iass">IASS - IAS Support</option>
						<option value="iasg">IASG - IAS Ground Handling</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Unit Kerja/Divisi *</label>
					<select bind:value={formData.orgUnitId} class="w-full px-3 py-2 border rounded-md">
						<option value="">Pilih unit kerja...</option>
						<option value="">-- Pilih entitas terlebih dahulu --</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Posisi/Jabatan *</label>
					<select bind:value={formData.positionId} class="w-full px-3 py-2 border rounded-md">
						<option value="">Pilih posisi...</option>
						<option value="">Direktur</option>
						<option value="">General Manager</option>
						<option value="">Manager</option>
						<option value="">Supervisor</option>
						<option value="">Staff</option>
					</select>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Lokasi Kerja</label>
						<select bind:value={formData.workLocation} class="w-full px-3 py-2 border rounded-md">
							<option value="">Pilih lokasi...</option>
							<option value="CGK">CGK - Jakarta</option>
							<option value="DPS">DPS - Bali</option>
							<option value="KNO">KNO - Medan</option>
							<option value="UPG">UPG - Makassar</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Regional</label>
						<select bind:value={formData.region} class="w-full px-3 py-2 border rounded-md">
							<option value="">Pilih regional...</option>
							<option value="Regional 1">Regional 1</option>
							<option value="Regional 2">Regional 2</option>
							<option value="Regional 3">Regional 3</option>
							<option value="Regional 4">Regional 4</option>
						</select>
					</div>
				</div>
			</div>

		{:else if step === 4}
			<!-- SSO Access -->
			<h3 class="text-lg font-medium mb-4">🔐 SSO Access (Optional)</h3>

			<div class="mb-6">
				<label class="flex items-center space-x-3 cursor-pointer">
					<input type="checkbox" bind:checked={formData.createSSOAccount} class="w-5 h-5 rounded" />
					<span class="text-sm font-medium">Buat akun SSO untuk karyawan ini</span>
				</label>
				<p class="text-sm text-gray-500 mt-1 ml-8">
					Jika dicentang, karyawan dapat login ke sistem dan aplikasi yang terintegrasi
				</p>
			</div>

			{#if formData.createSSOAccount}
				<div class="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Username *</label>
						<input type="text" bind:value={formData.username} required class="w-full px-3 py-2 border rounded-md" placeholder="nama.user" />
						<p class="text-xs text-gray-500 mt-1">Digunakan untuk login, format: nama.belakang</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Password Temporary *</label>
						<input type="password" bind:value={formData.password} required class="w-full px-3 py-2 border rounded-md" />
						<p class="text-xs text-gray-500 mt-1">User akan diminta mengganti password saat login pertama</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Roles</label>
						<div class="space-y-2">
							<label class="flex items-center space-x-2">
								<input type="checkbox" checked disabled class="rounded" />
								<span class="text-sm">user (default)</span>
							</label>
							<label class="flex items-center space-x-2">
								<input type="checkbox" class="rounded" />
								<span class="text-sm">hr</span>
							</label>
							<label class="flex items-center space-x-2">
								<input type="checkbox" class="rounded" />
								<span class="text-sm">manager</span>
							</label>
						</div>
					</div>
				</div>
			{:else}
				<div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
					<p class="text-sm text-gray-600">
						Karyawan tidak akan memiliki akses SSO. Anda dapat menambahkan akses SSO nanti dari halaman detail karyawan.
					</p>
				</div>
			{/if}

		{:else if step === 5}
			<!-- Review -->
			<h3 class="text-lg font-medium mb-4">✅ Review & Konfirmasi</h3>

			<div class="space-y-6">
				<div>
					<h4 class="font-medium text-gray-900 mb-2">Personal Information</h4>
					<dl class="grid grid-cols-2 gap-2 text-sm">
						<dt class="text-gray-500">Nama:</dt>
						<dd class="font-medium">{formData.firstName} {formData.lastName}</dd>
						<dt class="text-gray-500">Email:</dt>
						<dd class="font-medium">{formData.email}</dd>
						<dt class="text-gray-500">Telepon:</dt>
						<dd class="font-medium">{formData.phone || '-'}</dd>
					</dl>
				</div>

				<div>
					<h4 class="font-medium text-gray-900 mb-2">Employment Information</h4>
					<dl class="grid grid-cols-2 gap-2 text-sm">
						<dt class="text-gray-500">NIP:</dt>
						<dd class="font-medium">{formData.employeeId}</dd>
						<dt class="text-gray-500">Jenis:</dt>
						<dd class="font-medium">{formData.employmentType}</dd>
						<dt class="text-gray-500">Tanggal Bergabung:</dt>
						<dd class="font-medium">{formData.joinDate}</dd>
					</dl>
				</div>

				<div>
					<h4 class="font-medium text-gray-900 mb-2">Penempatan</h4>
					<dl class="grid grid-cols-2 gap-2 text-sm">
						<dt class="text-gray-500">Entitas:</dt>
						<dd class="font-medium">{formData.organizationId || '-'}</dd>
						<dt class="text-gray-500">Unit Kerja:</dt>
						<dd class="font-medium">{formData.orgUnitId || '-'}</dd>
						<dt class="text-gray-500">Posisi:</dt>
						<dd class="font-medium">{formData.positionId || '-'}</dd>
						<dt class="text-gray-500">Lokasi:</dt>
						<dd class="font-medium">{formData.workLocation || '-'}</dd>
					</dl>
				</div>

				<div>
					<h4 class="font-medium text-gray-900 mb-2">SSO Access</h4>
					{#if formData.createSSOAccount}
						<div class="p-3 bg-green-50 border border-green-200 rounded">
							<p class="text-sm text-green-800">✓ Akun SSO akan dibuat dengan username: <strong>{formData.username}</strong></p>
						</div>
					{:else}
						<div class="p-3 bg-gray-50 border border-gray-200 rounded">
							<p class="text-sm text-gray-600">✗ Tidak ada akun SSO</p>
						</div>
					{/if}
				</div>

				<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<h4 class="font-medium text-blue-900 mb-2">Checklist Onboarding</h4>
					<ul class="text-sm text-blue-800 space-y-1">
						<li>✓ Data karyawan akan disimpan di database</li>
						{#if formData.createSSOAccount}
							<li>✓ Akun SSO akan dibuat</li>
							<li>✓ Email notifikasi akan dikirim ke karyawan</li>
						{/if}
						<li>✓ Riwayat onboarding akan dicatat</li>
						<li>✓ Status karyawan: Active</li>
					</ul>
				</div>
			</div>
		{/if}

		<!-- Navigation Buttons -->
		<div class="flex justify-between mt-8 pt-6 border-t">
			<button
				type="button"
				onclick={prevStep}
				disabled={step === 1}
				class="px-6 py-2 border rounded-md {step === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}"
			>
				← Sebelumnya
			</button>

			{#if step < 5}
				<button
					type="button"
					onclick={nextStep}
					class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					Selanjutnya →
				</button>
			{:else}
				<button
					type="submit"
					disabled={submitting}
					class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{submitting ? '⏳ Memproses...' : '✓ Selesaikan Onboarding'}
				</button>
			{/if}
		</div>

		<!-- Hidden inputs for form submission -->
		<input type="hidden" name="firstName" value={formData.firstName} />
		<input type="hidden" name="lastName" value={formData.lastName} />
		<input type="hidden" name="email" value={formData.email} />
		<input type="hidden" name="phone" value={formData.phone} />
		<input type="hidden" name="gender" value={formData.gender} />
		<input type="hidden" name="dateOfBirth" value={formData.dateOfBirth} />
		<input type="hidden" name="employeeId" value={formData.employeeId} />
		<input type="hidden" name="employmentType" value={formData.employmentType} />
		<input type="hidden" name="joinDate" value={formData.joinDate} />
		<input type="hidden" name="probationEndDate" value={formData.probationEndDate} />
		<input type="hidden" name="organizationId" value={formData.organizationId} />
		<input type="hidden" name="orgUnitId" value={formData.orgUnitId} />
		<input type="hidden" name="positionId" value={formData.positionId} />
		<input type="hidden" name="workLocation" value={formData.workLocation} />
		<input type="hidden" name="region" value={formData.region} />
		<input type="hidden" name="createSSOAccount" value={formData.createSSOAccount} />
		<input type="hidden" name="username" value={formData.username} />
		<input type="hidden" name="password" value={formData.password} />
		<input type="hidden" name="roles" value={JSON.stringify(formData.roles)} />
		<input type="hidden" name="customProperties" value={JSON.stringify(formData.customProperties)} />
	</div>
</form>
</div>
