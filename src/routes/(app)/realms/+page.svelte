<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showModal = $state(false);
</script>

<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang Realm</h3>
				<p class="mt-1 text-sm text-blue-700">
					Realm adalah konsep yang mirip dengan tenant atau workspace. Setiap realm memiliki pengguna,
					organisasi, dan konfigurasi OAuth yang terisolasi. Realm di Aksara SSO menggunakan
					<strong>Organizations</strong> sebagai basis, sehingga setiap organisasi dapat dianggap sebagai realm terpisah.
				</p>
			</div>
		</div>
	</div>

	<div class="flex justify-between items-center">
		<div>
			<p class="text-sm text-gray-500">Kelola realm/tenant untuk multi-organisasi</p>
		</div>
		<button
			onclick={() => (showModal = true)}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
		>
			+ Buat Realm Baru
		</button>
	</div>

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

	<!-- Realms Grid -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each data.realms as realm}
			<div class="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
				<div class="flex items-start justify-between">
					<div class="flex items-center space-x-3">
						<div class="text-4xl">
							{realm.type === 'parent' ? '🏛️' : realm.type === 'subsidiary' ? '🏢' : '📍'}
						</div>
						<div>
							<h3 class="text-lg font-medium text-gray-900">{realm.name}</h3>
							<p class="text-sm text-gray-500">{realm.code}</p>
						</div>
					</div>
				</div>

				<div class="mt-4 space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span class="text-gray-500">Type:</span>
						<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
							{realm.type}
						</span>
					</div>

					<div class="flex items-center justify-between text-sm">
						<span class="text-gray-500">Status:</span>
						<span class="px-2 py-1 text-xs font-semibold rounded-full {realm.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
							{realm.isActive ? 'Aktif' : 'Nonaktif'}
						</span>
					</div>

					<div class="flex items-center justify-between text-sm">
						<span class="text-gray-500">Pengguna:</span>
						<span class="font-medium text-gray-900">{realm.userCount || 0}</span>
					</div>

					<div class="flex items-center justify-between text-sm">
						<span class="text-gray-500">Karyawan:</span>
						<span class="font-medium text-gray-900">{realm.employeeCount || 0}</span>
					</div>
				</div>

				<div class="mt-4 pt-4 border-t border-gray-200 flex justify-between">
					<button class="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
						⚙️ Konfigurasi
					</button>
					<button class="text-sm text-blue-600 hover:text-blue-900 font-medium">
						📊 Detail
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Realm Settings Summary -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Pengaturan Realm Global</h3>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-900">Token Expiration</p>
						<p class="text-xs text-gray-500">Default untuk semua realm</p>
					</div>
					<span class="text-sm font-semibold text-indigo-600">1 hour</span>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-900">Refresh Token</p>
						<p class="text-xs text-gray-500">Masa aktif refresh token</p>
					</div>
					<span class="text-sm font-semibold text-indigo-600">30 days</span>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-900">Session Timeout</p>
						<p class="text-xs text-gray-500">Idle session timeout</p>
					</div>
					<span class="text-sm font-semibold text-indigo-600">7 days</span>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-900">Total Realms</p>
						<p class="text-xs text-gray-500">Organisasi terdaftar</p>
					</div>
					<span class="text-sm font-semibold text-indigo-600">{data.realms.length}</span>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Create Realm Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => (showModal = false)} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Buat Realm Baru</h3>

				<form method="POST" action="?/create" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Nama Realm</label>
						<input
							type="text"
							name="name"
							required
							placeholder="PT Contoh Organisasi"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Kode</label>
						<input
							type="text"
							name="code"
							required
							placeholder="CONTOH"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Tipe</label>
						<select
							name="type"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						>
							<option value="subsidiary">Subsidiary</option>
							<option value="parent">Parent</option>
							<option value="branch">Branch</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Deskripsi</label>
						<textarea
							name="description"
							rows="3"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						></textarea>
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onclick={() => (showModal = false)}
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Batal
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							Buat Realm
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
