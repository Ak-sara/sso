<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:realm-branding' });

	interface Props { form?: any; }
	let { form = $bindable() }: Props = $props();

	// Ensure branding defaults exist
	let branding = $state({
		appName: '', primaryColor: '#4f46e5', secondaryColor: '#7c3aed',
		accentColor: '#06b6d4', textColor: '#ffffff',
		logoBase64: '', loginBackgroundBase64: '',
		emailFromName: '', emailFromAddress: '', supportEmail: '', supportUrl: '',
		...(form?.branding ?? {})
	});

	async function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
		});
	}

	async function handleLogoUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) { showNotif('error', 'Upload file gambar'); return; }
		if (file.size > 2 * 1024 * 1024) { showNotif('error', 'Logo maksimal 2MB'); return; }
		try { branding.logoBase64 = await fileToBase64(file); }
		catch (err) { log.error('Logo upload error', { error: err }); showNotif('error', 'Gagal upload logo'); }
	}

	async function handleBgUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) { showNotif('error', 'Upload file gambar'); return; }
		if (file.size > 5 * 1024 * 1024) { showNotif('error', 'Background maksimal 5MB'); return; }
		try { branding.loginBackgroundBase64 = await fileToBase64(file); }
		catch (err) { log.error('Background upload error', { error: err }); showNotif('error', 'Gagal upload background'); }
	}
</script>

<FormModal wide title="Branding — {form?.name}" subtitle={form?.code} onClose={() => { form = null; }}>
	<div class="p-4 overflow-y-auto max-h-[70vh]">
		<form method="POST" action="?/updateBranding"
			use:enhance={() => async ({ result, update }) => {
				if (result.type === 'success') {
					showNotif('success', 'Branding berhasil disimpan');
					await invalidate('app:pagination');
					form = null;
				} else if (result.type === 'failure') {
					showNotif('error', (result.data as any)?.error ?? 'Gagal menyimpan branding');
				}
				await update({ reset: false });
			}}
			class="space-y-6">

			<input type="hidden" name="code" value={form?.code} />
			<input type="hidden" name="logoBase64" value={branding.logoBase64} />
			<input type="hidden" name="loginBackgroundBase64" value={branding.loginBackgroundBase64} />

			<!-- App Name -->
			<Input type="text" name="appName" label="App Name" bind:value={branding.appName} placeholder={form?.name} />

			<!-- Images -->
			<div class="border-t pt-4 space-y-4">
				<p class="text-sm font-medium text-gray-700">Images &amp; Assets</p>

				<div>
					<label class="block text-xs font-medium text-gray-700 mb-2">Logo <span class="text-gray-400">(also favicon, max 2MB)</span></label>
					{#if branding.logoBase64}
						<div class="mb-2 p-3 bg-gray-50 rounded-md border-2 border-dashed border-gray-300 text-center">
							<img src={branding.logoBase64} alt="Logo" class="h-16 w-auto object-contain mx-auto mb-2" />
							<button type="button" onclick={() => (branding.logoBase64 = '')}
								class="text-xs text-red-600 hover:text-red-800">✕ Hapus Logo</button>
						</div>
					{/if}
					<input type="file" accept="image/*" onchange={handleLogoUpload}
						class="w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
				</div>

				<div>
					<label class="block text-xs font-medium text-gray-700 mb-2">Login Background <span class="text-gray-400">(max 5MB)</span></label>
					{#if branding.loginBackgroundBase64}
						<div class="mb-2 p-3 bg-gray-50 rounded-md border-2 border-dashed border-gray-300 text-center">
							<img src={branding.loginBackgroundBase64} alt="Background" class="h-24 w-full object-cover rounded mb-2" />
							<button type="button" onclick={() => (branding.loginBackgroundBase64 = '')}
								class="text-xs text-red-600 hover:text-red-800">✕ Hapus Background</button>
						</div>
					{/if}
					<input type="file" accept="image/*" onchange={handleBgUpload}
						class="w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
				</div>
			</div>

			<!-- Colors -->
			<div class="border-t pt-4">
				<p class="text-sm font-medium text-gray-700 mb-3">Color Scheme</p>
				<div class="grid grid-cols-2 gap-3">
					{#each [
						['primaryColor','Primary','#4f46e5'],
						['secondaryColor','Secondary','#7c3aed'],
						['accentColor','Accent','#06b6d4'],
						['textColor','Button Text','#ffffff']
					] as [key, label, placeholder]}
						<div>
							<label class="block text-xs font-medium text-gray-600 mb-1">{label}</label>
							<div class="flex gap-2">
								<input type="color" bind:value={branding[key as keyof typeof branding]}
									class="h-9 w-12 rounded border border-gray-300 cursor-pointer" />
								<input type="text" name={key} bind:value={branding[key as keyof typeof branding]}
									placeholder={placeholder}
									class="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm font-mono" />
							</div>
						</div>
					{/each}
				</div>

				<!-- Preview -->
				<div class="mt-4 p-3 bg-gray-50 rounded-lg">
					<p class="text-xs text-gray-500 mb-2">Preview</p>
					<div class="flex gap-3">
						{#each [['primaryColor','Primary'],['secondaryColor','Secondary'],['accentColor','Accent']] as [key, label]}
							<div class="flex-1 text-center">
								<div class="h-12 rounded-md mb-1 border border-gray-200"
									style="background-color: {branding[key as keyof typeof branding]}"></div>
								<p class="text-xs text-gray-500">{label}</p>
							</div>
						{/each}
						<div class="flex-1 text-center">
							<div class="h-12 rounded-md mb-1 flex items-center justify-center text-sm font-medium border border-gray-200"
								style="background-color: {branding.primaryColor}; color: {branding.textColor}">
								Button
							</div>
							<p class="text-xs text-gray-500">Button</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Email Config -->
			<div class="border-t pt-4">
				<p class="text-sm font-medium text-gray-700 mb-3">Email Configuration</p>
				<div class="grid grid-cols-2 gap-3">
					<Input type="text" name="emailFromName" label="From Name"
						bind:value={branding.emailFromName} placeholder={branding.appName || form?.name} />
					<Input type="text" name="emailFromAddress" label="From Email"
						bind:value={branding.emailFromAddress} placeholder="noreply@example.com" />
					<Input type="text" name="supportEmail" label="Support Email"
						bind:value={branding.supportEmail} placeholder="support@example.com" />
					<Input type="text" name="supportUrl" label="Support URL"
						bind:value={branding.supportUrl} placeholder="https://support.example.com" />
				</div>
			</div>

			<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
					type="button" onclick={() => { form = null; }} > Batal </button>
				<button class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700"
					type="submit" > Simpan Branding </button>
			</div>
		</form>
	</div>
</FormModal>
