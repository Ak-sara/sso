<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<p class="text-sm text-gray-500">Kelola data partner non-karyawan</p>
		<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">+ Tambah Partner</button>
	</div>

	<div class="bg-white shadow rounded-lg overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perusahaan</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each data.partners as partner}
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-gray-900">{partner.contactName}</div>
							<div class="text-sm text-gray-500">{partner.partnerId}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
								{partner.type}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partner.email}</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partner.companyName || '-'}</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 py-1 text-xs font-semibold rounded-full {partner.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{partner.isActive ? 'Aktif' : 'Nonaktif'}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
							<button class="text-indigo-600 hover:text-indigo-900">Detail</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
