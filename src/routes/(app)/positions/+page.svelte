<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<p class="text-sm text-gray-500">Kelola data posisi/jabatan</p>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">+ Tambah Posisi</button>
	</div>

	<div class="grid gap-4">
		{#each data.positions as position}
			<div class="bg-white shadow rounded-lg p-6">
				<div class="flex justify-between items-start">
					<div>
						<h3 class="text-lg font-medium text-gray-900">{position.name}</h3>
						<p class="text-sm text-gray-500">Kode: {position.code} | Grade: {position.grade || '-'}</p>
						<div class="mt-2">
							<span class="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
								{position.level}
							</span>
						</div>
					</div>
					<span class="px-2 py-1 text-xs font-semibold rounded-full {position.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
						{position.isActive ? 'Aktif' : 'Nonaktif'}
					</span>
				</div>
			</div>
		{/each}
	</div>
</div>
