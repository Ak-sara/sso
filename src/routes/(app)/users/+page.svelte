<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showModal = $state(false);
	let editingUser = $state<any>(null);

	function openCreateModal() {
		editingUser = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingUser = null;
	}
</script>

<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang SSO Users</h3>
				<p class="mt-1 text-sm text-blue-700">
					SSO Users adalah akun yang dapat login ke sistem SSO. Tidak semua karyawan memiliki akun SSO.
					User dapat memiliki berbagai roles seperti <code class="bg-blue-100 px-1 rounded">admin</code>,
					<code class="bg-blue-100 px-1 rounded">user</code>, atau <code class="bg-blue-100 px-1 rounded">hr</code>.
					Setiap user dapat terhubung dengan data karyawan melalui <strong>employeeId</strong>.
				</p>
			</div>
		</div>
	</div>

	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola akun pengguna SSO</p>
		</div>
		<button
			onclick={openCreateModal}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
		>
			+ Tambah Pengguna
		</button>
	</div>

	<!-- Alerts -->
	{#if form?.success}
		<div class="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
			{form.success}
		</div>
	{/if}

	{#if form?.error}
		<div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
			{form.error}
		</div>
	{/if}

	<!-- Users Table -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Pengguna
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Email
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Roles
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Status
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Bergabung
					</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
						Aksi
					</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each data.users as user}
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="flex items-center">
								<div class="flex-shrink-0 h-10 w-10">
									<div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
										<span class="text-indigo-600 font-medium">
											{user.firstName?.[0]}{user.lastName?.[0]}
										</span>
									</div>
								</div>
								<div class="ml-4">
									<div class="text-sm font-medium text-gray-900">
										{user.firstName} {user.lastName}
									</div>
									<div class="text-sm text-gray-500">@{user.username}</div>
								</div>
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm text-gray-900">{user.email}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="flex gap-1">
								{#each user.roles as role}
									<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
										{role}
									</span>
								{/each}
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							{#if user.isActive}
								<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
									Aktif
								</span>
							{:else}
								<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
									Nonaktif
								</span>
							{/if}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{new Date(user.createdAt).toLocaleDateString('id-ID')}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
							<button class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
							<button class="text-red-600 hover:text-red-900">Hapus</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<!-- Backdrop -->
			<button
				onclick={closeModal}
				class="fixed inset-0 bg-black bg-opacity-50"
			></button>

			<!-- Modal Content -->
			<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
				<h3 class="text-lg font-medium text-gray-900 mb-4">
					Tambah Pengguna Baru
				</h3>

				<form method="POST" action="?/create" use:enhance class="space-y-4">
					<div>
						<label for="firstName" class="block text-sm font-medium text-gray-700">
							Nama Depan
						</label>
						<input
							type="text"
							id="firstName"
							name="firstName"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="lastName" class="block text-sm font-medium text-gray-700">
							Nama Belakang
						</label>
						<input
							type="text"
							id="lastName"
							name="lastName"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="username" class="block text-sm font-medium text-gray-700">
							Username
						</label>
						<input
							type="text"
							id="username"
							name="username"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="email" class="block text-sm font-medium text-gray-700">
							Email
						</label>
						<input
							type="email"
							id="email"
							name="email"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700">
							Password
						</label>
						<input
							type="password"
							id="password"
							name="password"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onclick={closeModal}
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							Simpan
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
