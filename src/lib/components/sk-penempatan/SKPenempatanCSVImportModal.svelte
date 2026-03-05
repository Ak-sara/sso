<script lang="ts">
	import { downloadCSVTemplate } from '$lib/services/sk-penempatan-utils';

	interface Director {
		employeeId: string;
		fullName: string;
		positionName: string;
	}

	interface Props {
		show: boolean;
		directors: Director[];
		onClose: () => void;
		formAction?: string;
	}

	let { show = $bindable(false), directors, onClose, formAction = '?/importCSV' }: Props = $props();

	let csvFile = $state<File | null>(null);

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			csvFile = input.files[0];
		}
	}

	function handleClose() {
		csvFile = null;
		onClose();
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 class="text-lg font-medium mb-4">Import Penempatan Karyawan dari CSV</h3>

			<form method="POST" action={formAction} enctype="multipart/form-data" class="space-y-4">
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
							<label class="block text-sm font-medium text-gray-700 mb-2"
								>Ditandatangani Oleh *</label
							>
							<select name="signedBy" required class="w-full px-3 py-2 border rounded-md">
								<option value="">-- Pilih --</option>
								{#each directors as director}
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
						onclick={downloadCSVTemplate}
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
						onclick={handleClose}
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
