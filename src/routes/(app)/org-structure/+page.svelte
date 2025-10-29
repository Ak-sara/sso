<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showCreateModal = $state(false);
	let selectedVersion = $state<any>(null);
</script>

<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">📋</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Versioning Struktur Organisasi</h3>
				<p class="mt-1 text-sm text-blue-700">
					Setiap perubahan struktur organisasi (penambahan/penghapusan unit, perubahan hierarki, atau mutasi karyawan)
					harus dibuat sebagai <strong>versi baru</strong> dengan <strong>Surat Keputusan (SK)</strong> resmi.
					Sistem akan otomatis mencatat perubahan dan menghasilkan daftar karyawan yang terdampak untuk dilampirkan ke SK.
				</p>
			</div>
		</div>
	</div>

	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">Versi Struktur Organisasi</h2>
			<p class="text-sm text-gray-500 mt-1">Kelola dan bandingkan versi struktur organisasi dari waktu ke waktu</p>
		</div>
		<button
			onclick={() => showCreateModal = true}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
			+ Buat Versi Baru
		</button>
	</div>

	<!-- Current Active Version -->
	{#if data.currentVersion}
		<div class="bg-white shadow rounded-lg p-6 border-2 border-green-500">
			<div class="flex items-center justify-between mb-4">
				<div class="flex flex-col items-center justify-between">
					<div class="flex items-center space-x-3 mb-4">
						<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
						✓ AKTIF
						</span>
						<h3 class="text-lg font-medium">Version {data.currentVersion.versionNumber}: {data.currentVersion.versionName}</h3>
					</div>
					<div class="grid grid-cols-4 gap-4 text-sm">
						<div>
							<p class="text-gray-500">Tanggal Efektif</p>
							<p class="font-medium">{new Date(data.currentVersion.effectiveDate).toLocaleDateString('id-ID')}</p>
						</div>
						<div>
							<p class="text-gray-500">Unit Kerja</p>
							<p class="font-medium">{data.currentVersion.structure.orgUnits.length} units</p>
						</div>
						<div>
							<p class="text-gray-500">Nomor SK</p>
							<p class="font-medium">{data.currentVersion.skNumber || '-'}</p>
						</div>
						<div>
							<p class="text-gray-500">Karyawan Terdampak</p>
							<p class="font-medium">{data.currentVersion.reassignments.length} orang</p>
						</div>
					</div>	
				</div>
				<div class="flex flex-col items-center justify-center gap-2">
					<a href="/org-structure/{data.currentVersion._id}/sto"
						class="px-3 py-1 text-sm border border-gray-300 rounded-md bg-green-100 hover:bg-yellow-100">View STO</a>
					<a href="/org-structure/{data.currentVersion._id}"
						class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
						Lihat Detail → </a>
				</div>
				
			</div>
		</div>
	{/if}

	<!-- Version History -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<div class="px-6 py-4 border-b border-gray-200">
			<h3 class="text-lg font-medium">Riwayat Versi</h3>
		</div>

		<div class="divide-y divide-gray-200">
			{#each data.versions as version}
				<div class="p-6 hover:bg-gray-50">
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<div class="flex items-center space-x-3 mb-2">
								<span class="text-lg font-semibold">v{version.versionNumber}</span>
								<span class="text-gray-900">{version.versionName}</span>
								{#if version.status === 'active'}
									<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
										AKTIF
									</span>
								{:else if version.status === 'pending_approval'}
									<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
										MENUNGGU APPROVAL
									</span>
								{:else if version.status === 'draft'}
									<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
										DRAFT
									</span>
								{:else}
									<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
										ARCHIVED
									</span>
								{/if}
							</div>

							<div class="grid grid-cols-5 gap-4 text-sm">
								<div>
									<p class="text-gray-500">Efektif</p>
									<p class="font-medium">{new Date(version.effectiveDate).toLocaleDateString('id-ID')}</p>
								</div>
								{#if version.endDate}
									<div>
										<p class="text-gray-500">Berakhir</p>
										<p class="font-medium">{new Date(version.endDate).toLocaleDateString('id-ID')}</p>
									</div>
								{/if}
								<div>
									<p class="text-gray-500">SK Number</p>
									<p class="font-medium">{version.skNumber || '-'}</p>
								</div>
								<div>
									<p class="text-gray-500">Perubahan</p>
									<p class="font-medium">{version.changes.length} items</p>
								</div>
								<div>
									<p class="text-gray-500">Reassignments</p>
									<p class="font-medium">{version.reassignments.length} karyawan</p>
								</div>
							</div>

							{#if version.notes}
								<p class="text-sm text-gray-600 mt-2 italic">{version.notes}</p>
							{/if}
						</div>

						<div class="flex space-x-2 ml-4">
							<a href="/org-structure/{version._id}/sto"
								class="px-3 py-1 text-sm border border-gray-300 rounded-md bg-green-100 hover:bg-yellow-100">View STO</a>
							<a href="/org-structure/{version._id}"
								class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Detail
							</a>
							{#if version.status === 'draft'}
								<button class="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
									Edit
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Create Version Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => showCreateModal = false} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 z-10">
				<h3 class="text-lg font-medium mb-4">Buat Versi Struktur Baru</h3>
				<p class="text-sm text-gray-600 mb-6">
					Versi baru akan dibuat berdasarkan struktur saat ini. Anda dapat mengedit struktur dan menambahkan
					informasi SK setelah versi dibuat.
				</p>

				<form method="POST" action="?/create" class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Nama Versi *</label>
						<input
							type="text"
							name="versionName"
							required
							placeholder="Contoh: 2025-Q2 Restructure Cargo Division"
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
						<label class="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
						<textarea
							name="notes"
							rows="3"
							placeholder="Alasan pembuatan versi baru, perubahan yang direncanakan, dll."
							class="w-full px-3 py-2 border rounded-md"
						></textarea>
					</div>

					<div class="flex justify-end space-x-3 mt-6">
						<button
							type="button"
							onclick={() => showCreateModal = false}
							class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							Buat Draft Versi
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
