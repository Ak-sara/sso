<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang Unit Kerja/Divisi</h3>
				<p class="mt-1 text-sm text-blue-700">
					Unit kerja adalah bagian dari struktur organisasi seperti Direktorat, Divisi, Departemen, Seksi, dll.
					Setiap unit memiliki hierarki dan dapat memiliki unit parent. Unit ini digunakan untuk penempatan
					karyawan dan pelaporan struktur organisasi.
				</p>
			</div>
		</div>
	</div>

	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola unit kerja dalam organisasi</p>
		</div>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
			+ Tambah Unit Kerja
		</button>
	</div>

	<!-- Org Units Tree/List -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Kerja</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each data.orgUnits as unit}
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="flex items-center">
								<span class="text-xl mr-2">
									{#if unit.type === 'board'}
										🏛️
									{:else if unit.type === 'directorate'}
										👔
									{:else if unit.type === 'division'}
										📁
									{:else if unit.type === 'department'}
										📂
									{:else if unit.type === 'section'}
										📄
									{:else if unit.type === 'sbu'}
										🏢
									{:else}
										📋
									{/if}
								</span>
								<div>
									<div class="text-sm font-medium text-gray-900" style="margin-left: {unit.level * 20}px">
										{unit.name}
									</div>
									{#if unit.shortName}
										<div class="text-xs text-gray-500">{unit.shortName}</div>
									{/if}
								</div>
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							<code class="bg-gray-100 px-2 py-1 rounded text-xs">{unit.code}</code>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
								{unit.type}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							Level {unit.level}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 py-1 text-xs font-semibold rounded-full {unit.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{unit.isActive ? 'Aktif' : 'Nonaktif'}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
							<button class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
							<button class="text-blue-600 hover:text-blue-900">Detail</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
