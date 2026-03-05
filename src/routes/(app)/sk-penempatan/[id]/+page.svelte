<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('info');
	let showImportModal = $state(false);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center space-x-3">
				{#if data.orgStructureVersion}
					<a href="/org-structure/versions/{data.orgStructureVersion._id}" class="text-gray-500 hover:text-gray-700">
						← Kembali ke Versi Struktur
					</a>
				{:else}
					<a href="/sk-penempatan" class="text-gray-500 hover:text-gray-700">
						← Kembali ke Daftar SK
					</a>
				{/if}
			</div>
			<h2 class="text-2xl font-bold mt-2">{data.sk.skNumber}</h2>
			<p class="text-sm text-gray-500 mt-1">
				{data.sk.skTitle || data.sk.description || 'SK Penempatan Karyawan'}
			</p>
			<div class="flex items-center space-x-3 mt-2">
				{#if data.sk.status === 'draft'}
					<span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
						DRAFT
					</span>
				{:else if data.sk.status === 'pending_approval'}
					<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
						MENUNGGU APPROVAL
					</span>
				{:else if data.sk.status === 'approved'}
					<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
						APPROVED
					</span>
				{:else if data.sk.status === 'executed'}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
						✓ EXECUTED
					</span>
				{/if}
			</div>
		</div>

		<div class="flex space-x-2">
			<button class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
				📥 Download SK
			</button>
			{#if data.sk.status === 'draft'}
				<button class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700">
					Submit for Approval
				</button>
			{/if}
		</div>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				onclick={() => activeTab = 'info'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'info' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				📋 Informasi SK
			</button>
			<button
				onclick={() => activeTab = 'employees'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'employees' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				👥 Karyawan Terdampak ({data.sk.totalReassignments || 0})
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'info'}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium mb-4">Informasi Surat Keputusan</h3>

			{#if data.orgStructureVersion}
				<div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<p class="text-sm text-blue-800">
						🔗 <strong>Terkait Versi Struktur Organisasi:</strong>
						<a href="/org-structure/versions/{data.orgStructureVersion._id}" class="underline font-semibold">
							{data.orgStructureVersion.versionName} (Version {data.orgStructureVersion.versionNumber})
						</a>
					</p>
				</div>
			{/if}

			<form method="POST" action="?/updateSK" class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Nomor SK *</label>
						<input
							type="text"
							name="skNumber"
							value={data.sk.skNumber || ''}
							placeholder="SK-PENEMPATAN-001/IAS/2025"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal SK *</label>
						<input
							type="date"
							name="skDate"
							value={data.sk.skDate ? new Date(data.sk.skDate).toISOString().split('T')[0] : ''}
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Judul SK</label>
					<input
						type="text"
						name="skTitle"
						value={data.sk.skTitle || ''}
						placeholder="Penempatan Karyawan Batch 1"
						class="w-full px-3 py-2 border rounded-md"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Efektif *</label>
						<input
							type="date"
							name="effectiveDate"
							value={data.sk.effectiveDate ? new Date(data.sk.effectiveDate).toISOString().split('T')[0] : ''}
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Ditandatangani Oleh</label>
						<select name="signedBy" class="w-full px-3 py-2 border rounded-md">
							<option value="">Pilih penandatangan...</option>
							{#each data.directors as director}
								<option value={director.employeeId} selected={data.sk.signedBy === director.employeeId}>
									{director.fullName} - {director.positionName}
								</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
					<textarea
						name="description"
						rows="3"
						class="w-full px-3 py-2 border rounded-md"
					>{data.sk.description || ''}</textarea>
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						Simpan Perubahan
					</button>
				</div>
			</form>
		</div>

	{:else if activeTab === 'employees'}
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-medium">Daftar Karyawan Terdampak</h3>
				<div class="flex space-x-2">
					<button
						type="button"
						onclick={() => showImportModal = true}
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
					>
						<span>📤</span>
						<span>Import CSV</span>
					</button>
					<a
						href="/api/sk-penempatan/template.csv"
						download
						class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2"
					>
						<span>📥</span>
						<span>Download Template</span>
					</a>
					{#if data.sk.reassignments && data.sk.reassignments.length > 0}
						<button class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
							📊 Export Excel
						</button>
					{/if}
				</div>
			</div>

			{#if !data.sk.reassignments || data.sk.reassignments.length === 0}
				<div class="border border-gray-200 rounded-lg p-12 text-center">
					<div class="text-gray-400 text-5xl mb-4">👥</div>
					<p class="text-gray-600 font-medium mb-2">Belum ada karyawan terdampak</p>
					<p class="text-sm text-gray-500 mb-4">
						Import data karyawan menggunakan file CSV atau tambahkan secara manual.
					</p>
					<button
						type="button"
						onclick={() => showImportModal = true}
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Import CSV
					</button>
				</div>
			{:else}
				<!-- Statistics -->
				<div class="grid grid-cols-3 gap-4 mb-6">
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<p class="text-sm text-blue-600 font-medium">Total Karyawan</p>
						<p class="text-2xl font-bold text-blue-900">{data.sk.totalReassignments}</p>
					</div>
					<div class="bg-green-50 border border-green-200 rounded-lg p-4">
						<p class="text-sm text-green-600 font-medium">Berhasil Dieksekusi</p>
						<p class="text-2xl font-bold text-green-900">{data.sk.successfulReassignments || 0}</p>
					</div>
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-sm text-red-600 font-medium">Gagal</p>
						<p class="text-2xl font-bold text-red-900">{data.sk.failedReassignments || 0}</p>
					</div>
				</div>

				<!-- Data Table -->
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIK</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dari Unit</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ke Unit</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posisi Baru</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each data.sk.reassignments as reassignment, i}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm">{i + 1}</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">{reassignment.employeeId}</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm">{reassignment.employeeName}</td>
									<td class="px-6 py-4 text-sm text-gray-600">
										<div class="text-xs">{reassignment.previousOrgUnitName || '-'}</div>
										<div class="text-xs text-gray-400">{reassignment.previousPositionName || ''}</div>
									</td>
									<td class="px-6 py-4 text-sm font-medium">
										<div class="text-xs">{reassignment.newOrgUnitName || '-'}</div>
									</td>
									<td class="px-6 py-4 text-sm">
										<div class="text-xs">{reassignment.newPositionName || '-'}</div>
									</td>
									<td class="px-6 py-4 text-sm text-gray-500">{reassignment.reason || '-'}</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm">
										{#if reassignment.executed}
											<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
												✓ Executed
											</span>
										{:else}
											<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
												Pending
											</span>
										{/if}
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

<!-- Import CSV Modal -->
{#if showImportModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button type="button" onclick={() => showImportModal = false} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10">
				<h3 class="text-lg font-medium mb-4">Import Data Karyawan dari CSV</h3>

				<form method="POST" action="?/importCSV" enctype="multipart/form-data" class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Upload File CSV</label>
						<input
							type="file"
							name="csvFile"
							accept=".csv"
							required
							class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
						/>
						<p class="text-xs text-gray-500 mt-1">Format: CSV (Comma-separated values)</p>
					</div>

					<div class="bg-blue-50 border border-blue-200 rounded p-4">
						<p class="text-sm text-blue-800 font-medium mb-2">📝 Format CSV:</p>
						<code class="text-xs text-blue-900 block">
							NIK,Nama,Unit Baru,Posisi Baru,Lokasi,Region,Alasan,Catatan
						</code>
						<p class="text-xs text-blue-700 mt-2">
							Download template untuk format yang benar.
						</p>
					</div>

					<div class="flex justify-end space-x-3">
						<button
							type="button"
							onclick={() => showImportModal = false}
							class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
						>
							Import CSV
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
