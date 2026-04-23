<script lang="ts">
	import FormModal from '$lib/components/FormModal.svelte';

	interface Props { open?: any; }
	let { open = $bindable() }: Props = $props();
</script>

<FormModal
	onClose={() => (open = null)}
	title="Buat Versi Struktur Baru"
	subtitle="Versi baru akan dibuat berdasarkan struktur saat ini">
	<div class="p-6">
		<p class="text-sm text-gray-600 mb-6">
			Anda dapat mengedit struktur dan menambahkan informasi SK setelah versi dibuat.
		</p>
		<form method="POST" action="?/create" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Nama Versi *</label>
				<input type="text" name="versionName" required
					placeholder="Contoh: 2025-Q2 Restructure Cargo Division"
					class="w-full px-3 py-2 border rounded-md" />
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Efektif *</label>
				<input type="date" name="effectiveDate" required class="w-full px-3 py-2 border rounded-md" />
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
				<textarea name="notes" rows="3"
					placeholder="Alasan pembuatan versi baru, perubahan yang direncanakan, dll."
					class="w-full px-3 py-2 border rounded-md"></textarea>
			</div>
			<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<button type="button" onclick={() => (open = null)}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
					Batal
				</button>
				<button type="submit"
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
					Buat Draft Versi
				</button>
			</div>
		</form>
	</div>
</FormModal>
