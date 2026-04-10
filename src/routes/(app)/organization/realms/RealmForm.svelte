<script lang="ts">
	interface Props {
		realm: any;
		onSave: () => void;
	}

	let { realm = $bindable(), onSave }: Props = $props();
	let newDomain = $state('');

	function addDomain() {
		if (!newDomain.trim()) return;

		const trimmedDomain = newDomain.trim().toLowerCase();

		const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
		if (!domainRegex.test(trimmedDomain)) {
			alert('Format domain tidak valid. Gunakan format: example.com atau *.com');
			return;
		}

		if (realm.allowedEmailDomains.includes(trimmedDomain)) {
			alert('Domain sudah ada dalam daftar');
			return;
		}

		realm.allowedEmailDomains = [...realm.allowedEmailDomains, trimmedDomain];
		newDomain = '';
	}

	function removeDomain(domain: string) {
		realm.allowedEmailDomains = realm.allowedEmailDomains.filter((d: string) => d !== domain);
	}
</script>

<!-- Content -->
<div class="p-6 space-y-4">
	<!-- Code -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Kode</label>
		{#if realm._id}
			<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{realm.code}</p>
			<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah</p>
		{:else}
			<input type="text" bind:value={realm.code} class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="CONTOH" required />
		{/if}
	</div>

	<!-- Name -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Nama Realm</label>
		<input
			type="text"
			bind:value={realm.name}
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		/>
	</div>

	<!-- Legal Name -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Nama Legal</label>
		<input
			type="text"
			bind:value={realm.legalName}
			placeholder={realm.name}
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		/>
	</div>

	<!-- Type -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
		<select
			bind:value={realm.type}
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		>
			<option value="subsidiary">Subsidiary</option>
			<option value="parent">Parent</option>
			<option value="branch">Branch</option>
		</select>
	</div>

	<!-- Description -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
		<textarea
			bind:value={realm.description}
			rows="3"
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		></textarea>
	</div>

	<!-- User Count (read-only) -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Pengguna</label>
		<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{realm.userCount || 0} users</p>
	</div>

	<!-- Active Status -->
	<div>
		<label class="flex items-center gap-2">
			<input
				type="checkbox"
				bind:checked={realm.isActive}
				class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
			/>
			<span class="text-sm font-medium text-gray-700">Realm Active</span>
		</label>
	</div>

	<!-- Email Domain Whitelist -->
	<div class="border-t pt-4">
		<label class="block text-sm font-medium text-gray-700 mb-1">Email Domain Whitelist</label>
		<p class="text-xs text-gray-500 mb-2">
			Domain email yang diizinkan untuk pendaftaran. Kosongkan untuk <strong>mengizinkan semua domain</strong>. Tambahkan domain untuk <strong>membatasi hanya domain tertentu</strong>.
		</p>
		<p class="text-xs text-blue-600 mb-3">
			💡 Gunakan wildcard untuk izinkan semua subdomain: <code class="bg-blue-50 px-1 rounded">*.com</code>, <code class="bg-blue-50 px-1 rounded">*.co.id</code>
		</p>

		<!-- Current domains list -->
		{#if realm.allowedEmailDomains && realm.allowedEmailDomains.length > 0}
			<div class="space-y-2 mb-3">
				{#each realm.allowedEmailDomains as domain}
					<div class="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
						<span class="flex-1 text-sm text-gray-700">@{domain}</span>
						<button
							type="button"
							onclick={() => removeDomain(domain)}
							class="text-red-600 hover:text-red-800 text-sm font-medium"
						>
							✕
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
				<p class="text-sm text-blue-800">
					ℹ️ <strong>Tidak ada domain yang dikonfigurasi.</strong> Semua domain email diizinkan untuk pendaftaran (tidak ada pembatasan).
				</p>
			</div>
		{/if}

		<!-- Add new domain input -->
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={newDomain}
				placeholder="contoh: ias.co.id atau *.com"
				class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						addDomain();
					}
				}}
			/>
			<button
				type="button"
				onclick={addDomain}
				class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
			>
				Tambah
			</button>
		</div>
	</div>
</div>

<!-- Footer -->
<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
	<button
		onclick={onSave}
		class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
	>
		{realm._id ? 'Save Changes' : 'Buat Realm'}
	</button>
</div>
