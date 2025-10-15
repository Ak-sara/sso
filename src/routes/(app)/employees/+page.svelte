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
				<h3 class="text-sm font-medium text-blue-800">Tentang Data Karyawan</h3>
				<p class="mt-1 text-sm text-blue-700">
					Data karyawan mencakup informasi demografis dan kepegawaian. Karyawan dapat memiliki berbagai jenis
					kepegawaian seperti <strong>Permanent</strong>, <strong>PKWT</strong> (Perjanjian Kerja Waktu Tertentu),
					atau <strong>OS</strong> (Outsource). Data ini terpisah dari akun SSO Users dan dapat dikaitkan
					melalui <code class="bg-blue-100 px-1 rounded">userId</code>.
				</p>
			</div>
		</div>
	</div>

	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola data karyawan perusahaan</p>
		</div>
		<a
			href="/employees/onboard"
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors inline-block"
		>
			+ Tambah Karyawan
		</a>
	</div>

	<!-- Employees Table -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Karyawan
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						NIP
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Email
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Organisasi
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Jenis Kepegawaian
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Status
					</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
						Aksi
					</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each data.employees as employee}
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="flex items-center">
								<div class="flex-shrink-0 h-10 w-10">
									<div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
										<span class="text-green-600 font-medium">
											{employee.firstName[0]}{employee.lastName[0]}
										</span>
									</div>
								</div>
								<div class="ml-4">
									<div class="text-sm font-medium text-gray-900">
										{employee.fullName}
									</div>
									<div class="text-sm text-gray-500">{employee.workLocation || '-'}</div>
								</div>
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
							{employee.employeeId}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{employee.email}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{employee.organizationName || '-'}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 py-1 text-xs font-semibold rounded-full {employee.employmentType === 'permanent' ? 'bg-green-100 text-green-800' : employee.employmentType === 'PKWT' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">
								{employee.employmentType}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							{#if employee.employmentStatus === 'active'}
								<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
									Aktif
								</span>
							{:else}
								<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
									{employee.employmentStatus}
								</span>
							{/if}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
							<a href="/employees/{employee._id}" class="text-indigo-600 hover:text-indigo-900">
								Detail & Edit
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
