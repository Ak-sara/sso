<script lang="ts">
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

	let { show = $bindable(false), directors, onClose, formAction = '?/create' }: Props = $props();
</script>

{#if show}
	<div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 class="text-lg font-medium mb-4">Buat SK Penempatan Baru</h3>

			<form method="POST" action={formAction} class="space-y-4">
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
						{#each directors as director}
							<option value={director.employeeId}>
								{director.fullName} - {director.positionName}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
					<textarea name="description" rows="3" class="w-full px-3 py-2 border rounded-md"
					></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						onclick={onClose}
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
