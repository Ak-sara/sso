<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'structure' | 'changes' | 'reassignments' | 'sk'>('structure');
	let showApproveModal = $state(false);

	// Initialize Mermaid
	onMount(() => {
		mermaid.initialize({
			startOnLoad: true,
			theme: 'default',
			flowchart: {
				useMaxWidth: true,
				htmlLabels: true,
				curve: 'basis'
			}
		});

		// Render diagrams after mount
		setTimeout(() => {
			mermaid.contentLoaded();
		}, 100);
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center space-x-3">
				<a href="/org-structure/versions" class="text-gray-500 hover:text-gray-700">
					← Kembali
				</a>
				<h2 class="text-2xl font-bold">
					Version {data.version.versionNumber}: {data.version.versionName}
				</h2>
				{#if data.version.status === 'active'}
					<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
						✓ AKTIF
					</span>
				{:else if data.version.status === 'pending_approval'}
					<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
						MENUNGGU APPROVAL
					</span>
				{:else if data.version.status === 'draft'}
					<span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
						DRAFT
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
			{#if data.version.status === 'draft'}
				<button
					onclick={() => showApproveModal = true}
					class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
				>
					Submit for Approval
				</button>
			{:else if data.version.status === 'pending_approval'}
				<form method="POST" action="?/approve" class="inline">
					<button
						type="submit"
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Approve & Activate
					</button>
				</form>
			{/if}
			<button class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
				📥 Download SK
			</button>
		</div>
	</div>

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
				onclick={() => activeTab = 'reassignments'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'reassignments' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				👥 Karyawan Terdampak ({data.version.reassignments.length})
			</button>
			<button
				onclick={() => activeTab = 'sk'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'sk' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				📋 Surat Keputusan
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'structure'}
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-lg font-medium">Mermaid Diagram</h3>
				<form method="POST" action="?/regenerateMermaid">
					<button
						type="submit"
						class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
					>
						🔄 Regenerate Diagram
					</button>
				</form>
			</div>

			{#if data.version.mermaidDiagram}
				<div class="border rounded p-4 bg-gray-50 mb-4">
					<div class="mb-4">
						<pre class="mermaid text-sm">{data.version.mermaidDiagram}</pre>
					</div>
					<details class="mt-4">
						<summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
							📝 View Mermaid Source Code
						</summary>
						<pre class="mt-2 text-xs overflow-x-auto bg-white p-3 rounded border">{data.version.mermaidDiagram}</pre>
					</details>
				</div>
			{:else}
				<div class="border border-yellow-300 rounded p-4 bg-yellow-50 mb-4">
					<p class="text-yellow-800 text-sm">
						⚠️ Diagram belum dibuat. Klik tombol <strong>Regenerate Diagram</strong> di atas untuk generate otomatis.
					</p>
				</div>
			{/if}

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

	{:else if activeTab === 'reassignments'}
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-medium">Daftar Karyawan Terdampak</h3>
				<button class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
					📥 Download Excel untuk Lampiran SK
				</button>
			</div>

			{#if data.version.reassignments.length === 0}
				<p class="text-gray-500">Tidak ada karyawan yang terdampak oleh perubahan ini.</p>
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
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efektif</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each data.version.reassignments as reassignment, i}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm">{i + 1}</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">{reassignment.employeeId}</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm">{reassignment.employeeName}</td>
									<td class="px-6 py-4 text-sm">
										<div class="text-gray-900">{reassignment.oldPositionName || '-'}</div>
										<div class="text-gray-500 text-xs">{reassignment.oldOrgUnitName || '-'}</div>
									</td>
									<td class="px-6 py-4 text-sm">
										<div class="text-gray-900 font-medium">{reassignment.newPositionName || '-'}</div>
										<div class="text-gray-500 text-xs">{reassignment.newOrgUnitName || '-'}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm">
										{new Date(reassignment.effectiveDate).toLocaleDateString('id-ID')}
									</td>
									<td class="px-6 py-4 text-sm text-gray-500">{reassignment.reason || '-'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<p class="text-sm text-yellow-800">
						💡 <strong>Tips:</strong> Tabel di atas akan otomatis menjadi lampiran Surat Keputusan.
						Download sebagai Excel dan lampirkan ke dokumen SK resmi.
					</p>
				</div>
			{/if}
		</div>

	{:else if activeTab === 'sk'}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium mb-4">Informasi Surat Keputusan</h3>

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

				{#if data.version.skAttachments.length > 0}
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
					<button
						type="submit"
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						Simpan Informasi SK
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<!-- Approve Modal -->
{#if showApproveModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => showApproveModal = false} class="fixed inset-0 bg-black bg-opacity-50"></button>

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
