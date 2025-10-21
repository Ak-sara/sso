<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showCreateModal = $state(false);
	let showImportCSVModal = $state(false);

	// CSV import state
	let csvFile = $state<File | null>(null);
	let csvContent = $state('');
	let parseResult = $state<any>(null);

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			csvFile = input.files[0];

			// Read file content
			const reader = new FileReader();
			reader.onload = (e) => {
				csvContent = e.target?.result as string;
			};
			reader.readAsText(csvFile);
		}
	}

	function downloadTemplate() {
		const template = `NIK,Nama,Unit Kerja Baru,Posisi Baru,Lokasi Kerja,Region,Alasan,Catatan
IAS-001,Budi Santoso,IT,Manager,Jakarta,Pusat,Promosi,Promoted to Manager
IAS-002,Siti Nurhaliza,ACC,Senior Staff,Jakarta,Pusat,Rotasi,Regular rotation`;

		const blob = new Blob([template], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'template_penempatan_karyawan.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	function getStatusBadge(status: string) {
		const badges = {
			draft: 'bg-gray-100 text-gray-800',
			pending_approval: 'bg-yellow-100 text-yellow-800',
			approved: 'bg-blue-100 text-blue-800',
			executed: 'bg-green-100 text-green-800',
			cancelled: 'bg-red-100 text-red-800'
		};
		return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
	}

	function getStatusLabel(status: string) {
		const labels = {
			draft: 'Draft',
			pending_approval: 'Menunggu Persetujuan',
			approved: 'Disetujui',
			executed: 'Sudah Dieksekusi',
			cancelled: 'Dibatalkan'
		};
		return labels[status as keyof typeof labels] || status;
	}
</script>

<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">📋</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang SK Penempatan Karyawan</h3>
				<p class="mt-1 text-sm text-blue-700">
					SK Penempatan adalah dokumen resmi untuk melakukan perubahan penempatan karyawan secara bulk.
					Anda dapat membuat SK baru secara manual atau mengimpor dari file CSV untuk penempatan massal.
					Setiap SK akan mencatat histori perubahan dan otomatis memperbarui data karyawan saat dieksekusi.
				</p>
			</div>
		</div>
	</div>

	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">SK Penempatan Karyawan</h1>
			<p class="text-sm text-gray-500">Kelola Surat Keputusan penempatan karyawan</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={() => (showImportCSVModal = true)}
				class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
			>
				📥 Import CSV
			</button>
			<button
				onclick={() => (showCreateModal = true)}
				class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
			>
				+ Buat SK Baru
			</button>
		</div>
	</div>

	<!-- SK List -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		{#if data.skList.length === 0}
			<div class="text-center py-12">
				<span class="text-6xl">📋</span>
				<h3 class="mt-2 text-sm font-medium text-gray-900">Belum ada SK Penempatan</h3>
				<p class="mt-1 text-sm text-gray-500">Mulai dengan membuat SK baru atau import dari CSV</p>
			</div>
		{:else}
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. SK</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal SK</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efektif</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
							Jumlah Karyawan
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Import</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.skList as sk}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">{sk.skNumber}</div>
								{#if sk.skTitle}
									<div class="text-xs text-gray-500">{sk.skTitle}</div>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{new Date(sk.skDate).toLocaleDateString('id-ID')}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{new Date(sk.effectiveDate).toLocaleDateString('id-ID')}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								<div class="flex items-center gap-2">
									<span class="font-medium">{sk.totalReassignments}</span>
									{#if sk.successfulReassignments > 0}
										<span class="text-xs text-green-600">
											({sk.successfulReassignments} sukses)
										</span>
									{/if}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="px-2 py-1 text-xs font-semibold rounded-full {getStatusBadge(sk.status)}">
									{getStatusLabel(sk.status)}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm">
								{#if sk.importedFromCSV}
									<span class="inline-flex items-center text-green-600" title={sk.csvFilename}>
										📁 CSV
									</span>
								{:else}
									<span class="text-gray-400">Manual</span>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								<a href="/sk-penempatan/{sk._id}" class="text-indigo-600 hover:text-indigo-900">
									Detail
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<!-- Create SK Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 class="text-lg font-medium mb-4">Buat SK Penempatan Baru</h3>

			<form method="POST" action="?/create" class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Nomor SK *</label>
						<input
							type="text"
							name="skNumber"
							required
							placeholder="SK/IAS/HR/001/2025"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal SK *</label>
						<input type="date" name="skDate" required class="w-full px-3 py-2 border rounded-md" />
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Judul SK</label>
					<input
						type="text"
						name="skTitle"
						placeholder="Penempatan Karyawan Periode Januari 2025"
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
						<option value="">-- Pilih --</option>
						{#each data.directors as director}
							<option value={director.employeeId}>
								{director.fullName} - {director.positionName}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
					<textarea name="description" rows="3" class="w-full px-3 py-2 border rounded-md"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="px-4 py-2 border rounded-md hover:bg-gray-50"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						Buat SK
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Import CSV Modal -->
{#if showImportCSVModal}
	<div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 class="text-lg font-medium mb-4">Import Penempatan Karyawan dari CSV</h3>

			<form method="POST" action="?/importCSV" enctype="multipart/form-data" class="space-y-4">
				<!-- SK Information -->
				<div class="border-b pb-4">
					<h4 class="font-medium mb-3">Informasi SK</h4>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Nomor SK *</label>
							<input
								type="text"
								name="skNumber"
								required
								placeholder="SK/IAS/HR/001/2025"
								class="w-full px-3 py-2 border rounded-md"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal SK *</label>
							<input type="date" name="skDate" required class="w-full px-3 py-2 border rounded-md" />
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
								<option value="">-- Pilih --</option>
								{#each data.directors as director}
									<option value={director.employeeId}>
										{director.fullName} - {director.positionName}
									</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- CSV Upload -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">File CSV *</label>
					<input
						type="file"
						name="csvFile"
						accept=".csv"
						required
						onchange={handleFileSelect}
						class="w-full px-3 py-2 border rounded-md"
					/>
					<p class="mt-2 text-xs text-gray-500">
						Format: NIK,Nama,Unit Kerja Baru,Posisi Baru,Lokasi Kerja,Region,Alasan,Catatan
					</p>
					<button
						type="button"
						onclick={downloadTemplate}
						class="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
					>
						📥 Download Template CSV
					</button>
				</div>

				{#if csvFile}
					<div class="bg-green-50 border border-green-200 rounded p-3">
						<p class="text-sm text-green-800">
							✓ File terpilih: <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(
								2
							)} KB)
						</p>
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						onclick={() => {
							showImportCSVModal = false;
							csvFile = null;
							csvContent = '';
						}}
						class="px-4 py-2 border rounded-md hover:bg-gray-50"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Import & Buat SK
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
