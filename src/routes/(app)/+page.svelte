<script lang="ts">
	export let data;

	const stats = [
		{ name: 'Total Pengguna', value: data.stats.users, icon: '👥', color: 'bg-blue-500' },
		{ name: 'Total Karyawan', value: data.stats.employees, icon: '👨‍💼', color: 'bg-green-500' },
		{ name: 'Organisasi', value: data.stats.organizations, icon: '🏢', color: 'bg-purple-500' },
		{ name: 'OAuth Clients', value: data.stats.clients, icon: '🔑', color: 'bg-orange-500' },
	];
</script>

<div class="space-y-6">
	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			<div class="bg-white overflow-hidden shadow rounded-lg">
				<div class="p-5">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="{stat.color} rounded-md p-3 text-white text-2xl">
								{stat.icon}
							</div>
						</div>
						<div class="ml-5 w-0 flex-1">
							<dl>
								<dt class="text-sm font-medium text-gray-500 truncate">
									{stat.name}
								</dt>
								<dd class="text-3xl font-semibold text-gray-900">
									{stat.value}
								</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Recent Activity -->
	<div class="bg-white shadow rounded-lg">
		<div class="px-6 py-4 border-b border-gray-200">
			<h3 class="text-lg font-medium text-gray-900">Aktivitas Terbaru</h3>
		</div>
		<div class="px-6 py-4">
			<div class="flow-root">
				<ul class="-mb-8">
					{#each data.recentActivity as activity, idx}
						<li>
							<div class="relative pb-8">
								{#if idx < data.recentActivity.length - 1}
									<span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
								{/if}
								<div class="relative flex space-x-3">
									<div>
										<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
											{activity.icon}
										</span>
									</div>
									<div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
										<div>
											<p class="text-sm text-gray-500">
												{activity.description}
											</p>
										</div>
										<div class="whitespace-nowrap text-right text-sm text-gray-500">
											{activity.time}
										</div>
									</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<a
			href="/users"
			class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
		>
			<div class="p-6">
				<div class="flex items-center">
					<div class="text-3xl mr-4">👥</div>
					<div>
						<h3 class="text-lg font-medium text-gray-900">Kelola Pengguna</h3>
						<p class="text-sm text-gray-500">Tambah, edit, atau hapus pengguna</p>
					</div>
				</div>
			</div>
		</a>

		<a
			href="/employees"
			class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
		>
			<div class="p-6">
				<div class="flex items-center">
					<div class="text-3xl mr-4">👨‍💼</div>
					<div>
						<h3 class="text-lg font-medium text-gray-900">Kelola Karyawan</h3>
						<p class="text-sm text-gray-500">Manajemen data karyawan</p>
					</div>
				</div>
			</div>
		</a>

		<a
			href="/org-structure"
			class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
		>
			<div class="p-6">
				<div class="flex items-center">
					<div class="text-3xl mr-4">🌳</div>
					<div>
						<h3 class="text-lg font-medium text-gray-900">Struktur Organisasi</h3>
						<p class="text-sm text-gray-500">Lihat dan kelola struktur</p>
					</div>
				</div>
			</div>
		</a>
	</div>
</div>
