<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

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
				<h3 class="text-sm font-medium text-blue-800">Tentang OAuth Clients</h3>
				<p class="mt-1 text-sm text-blue-700">
					OAuth Client adalah aplikasi yang dapat menggunakan SSO untuk autentikasi. Setiap client memiliki
					<strong>Client ID</strong> dan <strong>Client Secret</strong> yang digunakan untuk OAuth 2.0 flow.
					Anda perlu mengkonfigurasi <code class="bg-blue-100 px-1 rounded">Redirect URIs</code> dan
					<code class="bg-blue-100 px-1 rounded">Allowed Scopes</code> untuk keamanan.
				</p>
			</div>
		</div>
	</div>

	<div class="flex justify-between items-center">
		<p class="text-sm text-gray-500">Kelola OAuth 2.0 Clients untuk integrasi aplikasi</p>
		<button
			onclick={() => (showModal = true)}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
			+ Tambah Client
		</button>
	</div>

	{#if form?.success}
		<div class="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
			{form.success}
		</div>
	{/if}

	{#if form?.client}
		<div class="p-4 bg-blue-100 border border-blue-400 rounded-md">
			<h3 class="font-semibold text-blue-800">Client Berhasil Dibuat!</h3>
			<div class="mt-2 text-sm text-blue-700">
				<p><strong>Client ID:</strong> <code class="bg-blue-200 px-2 py-1 rounded">{form.client.client_id}</code></p>
				<p><strong>Client Secret:</strong> <code class="bg-blue-200 px-2 py-1 rounded">{form.client.client_secret}</code></p>
				<p class="text-red-600 mt-2">⚠️ Simpan credentials ini dengan aman. Secret tidak akan ditampilkan lagi.</p>
			</div>
		</div>
	{/if}

	<div class="grid gap-6">
		{#each data.clients as client}
			<div class="bg-white shadow rounded-lg p-6">
				<div class="flex justify-between items-start">
					<div class="flex-1">
						<h3 class="text-lg font-medium text-gray-900">{client.clientName}</h3>
						<p class="text-sm text-gray-500 mt-1">Client ID: <code class="bg-gray-100 px-2 py-1 rounded text-xs">{client.clientId}</code></p>

						<div class="mt-4 space-y-2">
							<div>
								<p class="text-xs font-medium text-gray-500">Redirect URIs:</p>
								<div class="mt-1 space-y-1">
									{#each client.redirectUris as uri}
										<p class="text-sm text-gray-700">• {uri}</p>
									{/each}
								</div>
							</div>

							<div>
								<p class="text-xs font-medium text-gray-500">Allowed Scopes:</p>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each client.allowedScopes as scope}
										<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">{scope}</span>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<div class="ml-4">
						{#if client.isActive}
							<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aktif</span>
						{:else}
							<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Nonaktif</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

{#if showModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={() => (showModal = false)} class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10">
				<h3 class="text-lg font-medium mb-4">Tambah OAuth Client Baru</h3>

				<form method="POST" action="?/create" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Nama Aplikasi</label>
						<input type="text" name="name" required class="mt-1 block w-full px-3 py-2 border rounded-md" />
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Redirect URIs (satu per baris)</label>
						<textarea name="redirect_uris" rows="3" required class="mt-1 block w-full px-3 py-2 border rounded-md"></textarea>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Allowed Scopes (pisahkan dengan spasi)</label>
						<input type="text" name="allowed_scopes" value="openid profile email" class="mt-1 block w-full px-3 py-2 border rounded-md" />
					</div>

					<div class="flex justify-end space-x-3 pt-4">
						<button type="button" onclick={() => (showModal = false)} class="px-4 py-2 border rounded-md">Batal</button>
						<button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Buat Client</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
