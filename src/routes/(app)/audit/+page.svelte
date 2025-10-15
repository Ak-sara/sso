<script lang="ts">
	let auditLogs = [
		{ action: 'Login', user: 'admin@ias.co.id', time: '5 menit lalu', icon: '🔐' },
		{ action: 'Create User', user: 'admin@ias.co.id', time: '2 jam lalu', icon: '👤' },
		{ action: 'Update Employee', user: 'admin@ias.co.id', time: '4 jam lalu', icon: '✏️' },
	];
</script>

<div class="space-y-6">
	<p class="text-sm text-gray-500">Riwayat aktivitas sistem</p>

	<div class="bg-white shadow rounded-lg overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pengguna</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each auditLogs as log}
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="flex items-center">
								<span class="text-xl mr-2">{log.icon}</span>
								<span class="text-sm font-medium text-gray-900">{log.action}</span>
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user}</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.time}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
