<script lang="ts">
	import { getStatusBadge, getStatusLabel, formatDateID } from '$lib/services/sk-penempatan-utils';

	interface SKPenempatan {
		_id: string;
		skNumber: string;
		skTitle?: string;
		skDate: string | Date;
		effectiveDate: string | Date;
		totalReassignments: number;
		successfulReassignments: number;
		status: string;
		importedFromCSV: boolean;
		csvFilename?: string;
	}

	interface Props {
		data: SKPenempatan[];
		emptyMessage?: string;
		detailLinkPrefix?: string;
	}

	let {
		data,
		emptyMessage = 'Belum ada SK Penempatan',
		detailLinkPrefix = '/sk-penempatan'
	}: Props = $props();
</script>

<div class="bg-white shadow rounded-lg overflow-hidden">
	{#if data.length === 0}
		<div class="text-center py-12">
			<span class="text-6xl">📋</span>
			<h3 class="mt-2 text-sm font-medium text-gray-900">{emptyMessage}</h3>
			<p class="mt-1 text-sm text-gray-500">Mulai dengan membuat SK baru atau import dari CSV</p>
		</div>
	{:else}
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. SK</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
						Tanggal SK
					</th>
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
				{#each data as sk}
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-gray-900">{sk.skNumber}</div>
							{#if sk.skTitle}
								<div class="text-xs text-gray-500">{sk.skTitle}</div>
							{/if}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{formatDateID(sk.skDate)}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{formatDateID(sk.effectiveDate)}
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
							<a href="{detailLinkPrefix}/{sk._id}" class="text-indigo-600 hover:text-indigo-900">
								Detail
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
