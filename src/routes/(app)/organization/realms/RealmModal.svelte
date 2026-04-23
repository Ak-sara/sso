<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { formEnhance } from '$lib/utils/form-enhance';

	interface Props { form?: any; }
	let { form = $bindable() }: Props = $props();

	const isNew = $derived(!form?._id);

	let domains = $state<string[]>(form?.allowedEmailDomains ?? []);
	let newDomain = $state('');

	const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

	function addDomain() {
		const d = newDomain.trim().toLowerCase();
		if (!d) return;
		if (!domainRegex.test(d)) { showNotif('error', 'Format domain tidak valid. Gunakan: example.com atau *.com'); return; }
		if (domains.includes(d)) { showNotif('error', 'Domain sudah ada dalam daftar'); return; }
		domains = [...domains, d];
		newDomain = '';
	}
</script>

<FormModal title={isNew ? 'Buat Realm Baru' : form?.name} subtitle={isNew ? '' : `Code: ${form?.code}`}
	onClose={() => { form = null; }}>
	<div class="p-4">
		<form method="POST" action="?/upsertRealm" class="space-y-4"
			use:formEnhance={{ 
				onSuccess: async () => {
					showNotif('success', isNew ? 'Realm berhasil dibuat' : 'Realm berhasil diperbarui');
					await invalidate('app:pagination');
					form = null;
				} 
			}} >

			<input type="hidden" name="_id" value={form?._id ?? ''} />
			<input type="hidden" name="code" value={form?.code ?? ''} />
			<input type="hidden" name="allowedEmailDomains" value={JSON.stringify(domains)} />

			{#if isNew}
				<Input type="text" name="code" label="Kode *" bind:value={form.code} placeholder="CONTOH" />
			{:else}
				<Input type="info" label="Kode" value={form?.code} />
			{/if}

			<Input type="text" name="name" label="Nama Realm *" bind:value={form.name} />
			<Input type="text" name="legalName" label="Nama Legal" bind:value={form.legalName} placeholder={form?.name} />
			<Input type="select" name="type" label="Tipe" bind:value={form.type}
				options={{ subsidiary: 'Subsidiary', parent: 'Parent', branch: 'Branch' }} />
			<Input type="textarea" name="description" label="Deskripsi" bind:value={form.description} rows={2} />

			{#if !isNew}
				<input type="hidden" name="isActive" value={form?.isActive ? 'true' : 'false'} />
				<Input type="checkbox" name="isActive_check" label="Realm Aktif" bind:value={form.isActive}
					onChange={() => { form.isActive = !form.isActive; }} />
			{/if}

			<!-- Domain Whitelist -->
			<div class="border-t pt-4">
				<p class="text-xs font-medium text-gray-700 mb-1">Email Domain Whitelist</p>
				<p class="text-xs text-gray-500 mb-2">Kosongkan untuk izinkan semua domain.</p>

				{#if domains.length > 0}
					<div class="space-y-1 mb-2">
						{#each domains as domain}
							<div class="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-md">
								<span class="flex-1 text-sm text-gray-700">@{domain}</span>
								<button type="button" onclick={() => { domains = domains.filter(d => d !== domain); }}
									class="text-red-600 hover:text-red-800 text-sm">✕</button>
							</div>
						{/each}
					</div>
				{/if}

				<div class="flex gap-2">
					<input type="text" bind:value={newDomain} placeholder="contoh: ias.co.id"
						class="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
						onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }} />
					<button type="button" onclick={addDomain}
						class="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
						Tambah
					</button>
				</div>
			</div>

			<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<button type="button" onclick={() => { form = null; }}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
					Batal
				</button>
				<button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
					{isNew ? 'Buat Realm' : 'Simpan'}
				</button>
			</div>
		</form>
	</div>
</FormModal>
