<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('structure');
	let showApproveModal = $state(false);
	let showCreateSKModal = $state(false);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center space-x-3">
				<a href="/org-structure" class="text-gray-500 hover:text-gray-700">
					← Kembali
				</a>
				<h2 class="text-2xl font-bold">
					Version {data.version.versionNumber}: {data.version.versionName}
				</h2>
				{#if data.version.status === 'active'}
					<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
						✓ AKTIF
					</span>
				{:else if data.version.status === 'draft'}
					<span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
						DRAFT
					</span>
				{:else if data.version.status === 'archived'}
					<span class="px-3 py-1 bg-gray-400 text-white text-sm font-semibold rounded-full">
						ARSIP
					</span>
				{/if}
			</div>
			<p class="text-sm text-gray-500 mt-1">
				Efektif: {new Date(data.version.effectiveDate).toLocaleDateString('id-ID')}
				{#if data.version.skNumber}
					• SK: {data.version.skNumber}
				{/if}
			</p>
		</div>

		<div class="flex space-x-2">
			<a href="/org-structure/{data.version._id}/sto"
				class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300">
				📊 View STO
			</a>
			{#if data.version.status === 'draft'}
				<!-- NEW: Simple publish button -->
				<form method="POST" action="?/publish" class="inline">
					<button type="submit"
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700" >
						🚀 Publish & Activate
					</button>
				</form>
			{:else if data.version.publishStatus === 'failed'}
				<!-- Resume failed publish -->
				<form method="POST" action="?/resumePublish" class="inline">
					<button type="submit"
						class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700" >
						🔄 Resume Publish
					</button>
				</form>
			{/if}
		</div>
		
	</div>
			
	<form method="POST" action="?/updateSK" class="space-y-4">
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Nomor SK *</label>
				<input
					type="text"
					name="skNumber"
					value={data.version.skNumber || ''}
					placeholder="SK-001/IAS/2025"
					class="w-full px-3 py-2 border rounded-md"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal SK *</label>
				<input
					type="date"
					name="skDate"
					value={data.version.skDate ? new Date(data.version.skDate).toISOString().split('T')[0] : ''}
					class="w-full px-3 py-2 border rounded-md"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Ditandatangani Oleh</label>
				<select name="skSignedBy" class="w-full px-3 py-2 border rounded-md">
					<option value="">Pilih penandatangan...</option>
					{#each data.directors as director}
						<option value={director.employeeId} selected={data.version.skSignedBy === director.employeeId}>
							{director.fullName} - {director.positionName}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Upload Dokumen SK</label>
				<input
					type="file"
					accept=".pdf,.docx"
					class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
				/>
				<p class="text-xs text-gray-500 mt-1">Format: PDF atau DOCX, max 10MB</p>
			</div>
		</div>

		{#if data.version.skAttachments && data.version.skAttachments.length > 0}
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Lampiran</label>
				<ul class="space-y-2">
					{#each data.version.skAttachments as attachment}
						<li class="flex items-center justify-between p-2 bg-gray-50 rounded">
							<div class="flex items-center space-x-2">
								<span class="text-sm">📄</span>
								<span class="text-sm">{attachment.filename}</span>
								<span class="text-xs text-gray-500">
									({new Date(attachment.uploadedAt).toLocaleDateString('id-ID')})
								</span>
							</div>
							<button class="text-red-600 hover:text-red-800 text-sm">Hapus</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex justify-end">
			<button type="submit"
				class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" >
				Simpan Informasi SK
			</button>
		</div>
	</form>
			
	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				onclick={() => activeTab = 'structure'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'structure' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				📊 Struktur Organisasi
			</button>
			<button
				onclick={() => activeTab = 'changes'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'changes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				🔄 Perubahan ({data.version.changes.length})
			</button>
			<button
				onclick={() => activeTab = 'sk-penempatan'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'sk-penempatan' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				👥 SK Penempatan ({data.linkedSKPenempatan?.length || 0})
			</button>
			<button
				onclick={() => activeTab = 'reassignments'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'reassignments' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				📊 Total Terdampak ({data.totalAffectedEmployees || 0})
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'structure'}
		<div class="bg-white shadow rounded-lg p-6">
			
			<h3 class="text-lg font-medium mt-8 mb-4">Unit Kerja ({data.version.structure.orgUnits.length})</h3>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kepala Unit</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each data.version.structure.orgUnits as unit}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">{unit.code}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm">{unit.name}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm">
									<span class="px-2 py-1 text-xs rounded {unit.type === 'directorate' ? 'bg-purple-100 text-purple-800' : unit.type === 'division' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
										{unit.type}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{data.version.structure.orgUnits.find(u => u._id === unit.parentId)?.code || '-'}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm">{unit.level}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{unit.headEmployeeId || '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

	{:else if activeTab === 'changes'}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium mb-4">Daftar Perubahan</h3>

			{#if data.version.changes.length === 0}
				<p class="text-gray-500">Tidak ada perubahan dari versi sebelumnya.</p>
			{:else}
				<div class="space-y-4">
					{#each data.version.changes as change}
						<div class="border-l-4 {change.type.includes('added') ? 'border-green-500' : change.type.includes('removed') ? 'border-red-500' : 'border-blue-500'} pl-4 py-2">
							<div class="flex items-start justify-between">
								<div>
									<p class="font-medium">
										{#if change.type === 'unit_added'}🟢 Unit Ditambahkan
										{:else if change.type === 'unit_removed'}🔴 Unit Dihapus
										{:else if change.type === 'unit_renamed'}🔵 Unit Diganti Nama
										{:else if change.type === 'unit_moved'}🔵 Unit Dipindah
										{:else if change.type === 'unit_merged'}🔵 Unit Digabung
										{:else}{change.type}{/if}
									</p>
									<p class="text-sm text-gray-600">{change.description}</p>
									{#if change.oldValue}
										<p class="text-xs text-gray-500 mt-1">
											Lama: <code class="bg-gray-100 px-1 rounded">{JSON.stringify(change.oldValue)}</code>
										</p>
									{/if}
									{#if change.newValue}
										<p class="text-xs text-gray-500">
											Baru: <code class="bg-gray-100 px-1 rounded">{JSON.stringify(change.newValue)}</code>
										</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	{:else if activeTab === 'sk-penempatan'}
		<!-- SK Penempatan Karyawan (Detail/Children) -->
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h3 class="text-lg font-medium">👥 SK Penempatan Karyawan</h3>
					<p class="text-sm text-gray-600 mt-1">
						Daftar SK Penempatan yang diterbitkan untuk karyawan terdampak perubahan struktur ini.
					</p>
				</div>
				<button
					type="button"
					onclick={() => showCreateSKModal = true}
					class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
				>
					<span>+</span>
					<span>Buat SK Penempatan Baru</span>
				</button>
			</div>

			{#if data.linkedSKPenempatan && data.linkedSKPenempatan.length > 0}
				<div class="space-y-3">
					{#each data.linkedSKPenempatan as sk}
						<a
							href="/sk-penempatan/{sk._id}"
							class="block p-5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center space-x-3 mb-2">
										<p class="font-semibold text-gray-900">{sk.skNumber}</p>
										{#if sk.status === 'draft'}
											<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
												DRAFT
											</span>
										{:else if sk.status === 'pending_approval'}
											<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
												PENDING
											</span>
										{:else if sk.status === 'approved'}
											<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
												APPROVED
											</span>
										{:else if sk.status === 'executed'}
											<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
												EXECUTED
											</span>
										{/if}
									</div>
									<p class="text-sm text-gray-600 mb-1">{sk.skTitle || sk.description}</p>
									<div class="flex items-center space-x-4 text-xs text-gray-500">
										<span>📅 {new Date(sk.skDate).toLocaleDateString('id-ID')}</span>
										<span>•</span>
										<span>Efektif: {new Date(sk.effectiveDate).toLocaleDateString('id-ID')}</span>
										<span>•</span>
										<span class="font-medium text-indigo-600">{sk.totalReassignments} karyawan</span>
									</div>
								</div>
								<div class="text-gray-400">
									→
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="border border-gray-200 rounded-lg p-12 text-center">
					<div class="text-gray-400 text-5xl mb-4">📋</div>
					<p class="text-gray-600 font-medium mb-2">Belum ada SK Penempatan</p>
					<p class="text-sm text-gray-500">
						Klik tombol "Buat SK Penempatan Baru" untuk membuat SK penempatan karyawan.
					</p>
				</div>
			{/if}
		</div>

	{:else if activeTab === 'reassignments'}
		<!-- Aggregate Karyawan Terdampak from all SK Penempatan -->
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="text-lg font-medium">📊 Total Karyawan Terdampak</h3>
					<p class="text-sm text-gray-600 mt-1">
						Agregasi seluruh karyawan yang terdampak dari semua SK Penempatan.
					</p>
				</div>
				<button class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
					📥 Download Excel
				</button>
			</div>

			{#if data.totalAffectedEmployees === 0}
				<div class="border border-gray-200 rounded p-6 text-center">
					<p class="text-gray-500">Tidak ada karyawan yang terdampak.</p>
					<p class="text-sm text-gray-400 mt-2">
						Buat SK Penempatan terlebih dahulu untuk menambahkan karyawan terdampak.
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIK</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dari</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ke</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SK Penempatan</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each data.aggregatedReassignments || [] as reassignment, i}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm">{i + 1}</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">{reassignment.employeeId}</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm">{reassignment.employeeName}</td>
									<td class="px-6 py-4 text-sm text-gray-600 text-xs">
										{reassignment.previousOrgUnitName || '-'}
									</td>
									<td class="px-6 py-4 text-sm font-medium text-xs">
										{reassignment.newOrgUnitName || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
										<a href="/sk-penempatan/{reassignment.skPenempatanId}" class="hover:underline">
											{reassignment.skNumber}
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Approve Modal -->
{#if showApproveModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button type="button" onclick={() => showApproveModal = false} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
				<h3 class="text-lg font-medium mb-4">Submit for Approval</h3>
				<p class="text-sm text-gray-600 mb-6">
					Apakah Anda yakin ingin submit versi ini untuk approval? Setelah di-submit, versi tidak dapat diedit lagi.
				</p>

				<div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
					<p class="text-sm text-yellow-800">
						⚠️ Pastikan:<br>
						• Semua perubahan sudah benar<br>
						• Informasi SK sudah lengkap<br>
						• Daftar karyawan terdampak sudah akurat
					</p>
				</div>

				<form method="POST" action="?/submitApproval" class="flex justify-end space-x-3">
					<button
						type="button"
						onclick={() => showApproveModal = false}
						class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
					>
						Submit for Approval
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Create SK Penempatan Modal -->
{#if showCreateSKModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button type="button" onclick={() => showCreateSKModal = false} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 z-10">
				<h3 class="text-lg font-medium mb-4">Buat SK Penempatan Baru</h3>

				<form method="POST" action="?/createSKPenempatan" class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Nomor SK *</label>
							<input
								type="text"
								name="skNumber"
								placeholder="SK-PENEMPATAN-001/IAS/2025"
								required
								class="w-full px-3 py-2 border rounded-md"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal SK *</label>
							<input
								type="date"
								name="skDate"
								required
								class="w-full px-3 py-2 border rounded-md"
							/>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Judul SK</label>
						<input
							type="text"
							name="skTitle"
							placeholder="Penempatan Karyawan Batch 1"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Efektif *</label>
						<input
							type="date"
							name="effectiveDate"
							required
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Ditandatangani Oleh *</label>
						<select name="signedBy" required class="w-full px-3 py-2 border rounded-md">
							<option value="">Pilih penandatangan...</option>
							{#each data.directors as director}
								<option value={director.employeeId}>
									{director.fullName} - {director.positionName}
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
						<textarea
							name="description"
							rows="3"
							placeholder="Deskripsi SK Penempatan..."
							class="w-full px-3 py-2 border rounded-md"
						></textarea>
					</div>

					<div class="bg-blue-50 border border-blue-200 rounded p-4">
						<p class="text-sm text-blue-800">
							💡 Setelah SK Penempatan dibuat, Anda dapat menambahkan karyawan terdampak melalui:
							<br>• Import CSV
							<br>• Manual entry
						</p>
					</div>

					<div class="flex justify-end space-x-3">
						<button
							type="button"
							onclick={() => showCreateSKModal = false}
							class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
						>
							Buat SK Penempatan
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
