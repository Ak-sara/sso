<script lang="ts">
	import type { PageData } from './$types';
	import SKPenempatanTable from '$lib/components/sk-penempatan/SKPenempatanTable.svelte';
	import SKPenempatanCreateModal from '$lib/components/sk-penempatan/SKPenempatanCreateModal.svelte';
	import SKPenempatanCSVImportModal from '$lib/components/sk-penempatan/SKPenempatanCSVImportModal.svelte';

	let { data }: { data: PageData } = $props();

	let showCreateModal = $state(false);
	let showImportCSVModal = $state(false);
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
	<SKPenempatanTable data={data.skList} />
</div>

<!-- Modals -->
<SKPenempatanCreateModal
	bind:show={showCreateModal}
	directors={data.directors}
	onClose={() => (showCreateModal = false)}
/>

<SKPenempatanCSVImportModal
	bind:show={showImportCSVModal}
	directors={data.directors}
	onClose={() => (showImportCSVModal = false)}
/>
