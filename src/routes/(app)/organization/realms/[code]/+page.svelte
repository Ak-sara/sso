<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { formEnhance } from '$lib/utils/form-enhance';
	import Input from '$lib/components/Input.svelte';
	import RealmRoleModal from '../RealmRoleModal.svelte';
	import MailerModal from './MailerModal.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:realm-detail' });

	let { data }: { data: PageData } = $props();

	let domains = $state<string[]>(data.realm?.allowedEmailDomains ?? []);
	let newDomain = $state('');
	let isActive = $state(data.realm?.isActive ?? true);
	const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

	function addDomain() {
		const d = newDomain.trim().toLowerCase();
		if (!d) return;
		if (!domainRegex.test(d)) { showNotif('error', 'Invalid domain format. Use: example.com or *.com'); return; }
		if (domains.includes(d)) { showNotif('error', 'Domain already in list'); return; }
		domains = [...domains, d];
		newDomain = '';
	}

	let branding = $state({
		appName: '', primaryColor: '#4f46e5', secondaryColor: '#7c3aed',
		accentColor: '#06b6d4', textColor: '#ffffff',
		logoBase64: '', loginBackgroundBase64: '',
		emailFromName: '', emailFromAddress: '', supportEmail: '', supportUrl: '',
		...(data.realm?.branding ?? {})
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
		if (!file.type.startsWith('image/')) { showNotif('error', 'Please upload an image file'); return; }
		if (file.size > 2 * 1024 * 1024) { showNotif('error', 'Logo must be under 2MB'); return; }
		try { branding.logoBase64 = await fileToBase64(file); }
		catch (err) { log.error('Logo upload error', { error: err }); showNotif('error', 'Failed to upload logo'); }
	}

	async function handleBgUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) { showNotif('error', 'Please upload an image file'); return; }
		if (file.size > 5 * 1024 * 1024) { showNotif('error', 'Background must be under 5MB'); return; }
		try { branding.loginBackgroundBase64 = await fileToBase64(file); }
		catch (err) { log.error('Background upload error', { error: err }); showNotif('error', 'Failed to upload background'); }
	}

	// Realm Roles
	let actRole: any = $state(null);

	// Email Transport
	let actMailer: any = $state(null);

	function clientNames(ids: string[]) {
		return ids.map((id) => data.clients.find((c) => c.clientId === id)?.clientName || id);
	}

	async function removeRole(id: string) {
		if (!confirm('Delete this realm role? Any assignment using it will lose the app access it grants.')) return;
		const fd = new FormData();
		fd.append('_id', id);
		const res = await fetch('?/deleteRealmRole', { method: 'POST', body: fd });
		const result = await res.json().catch(() => null);
		if (!res.ok || result?.type === 'failure') {
			showNotif('error', 'Failed to delete realm role');
			return;
		}
		showNotif('success', 'Realm role deleted');
		await invalidateAll();
	}
</script>

<div class="max-w-5xl mx-auto">
	<!-- Header -->
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center space-x-4">
			<a href="/organization/realms" class="text-gray-500 hover:text-gray-700">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<div>
				<h1 class="text-2xl text-gray-900">
					Realm: <span class="font-bold">{data.isNew ? 'New Realm' : data.realm?.name}</span>
				</h1>
				{#if !data.isNew}
					<p class="text-sm text-gray-500">Code: {data.realm?.code}</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Realm Info -->
	<form method="POST" action="?/upsertRealm" use:formEnhance={{ success: data.isNew ? 'Realm created' : 'Realm updated' }}>
		<div class="bg-white shadow rounded-lg overflow-hidden mb-6">
			<div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Realm Info</h2>
				<button class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
					type="submit"> 💾 {data.isNew ? 'Create Realm' : 'Save'}
				</button>
			</div>

			<div class="grid grid-cols-2 gap-4 px-6 py-4">
				<input type="hidden" name="allowedEmailDomains" value={JSON.stringify(domains)} />
				<Input type="text" name="name" label="Realm Name *" value={data.realm?.name} />
				<div class="grid grid-cols-2 gap-4">
				{#if data.isNew}
					<Input type="text" name="code" label="Code *" placeholder="EXAMPLE" />
				{:else}
					<Input type="info" label="Code" value={data.realm?.code} />
				{/if}
				{#if !data.isNew}
					<input type="hidden" name="isActive" value={isActive ? 'true' : 'false'} />
					<Input type="checkbox" name="isActive_check" label="Active Realm" bind:value={isActive} />
				{/if}
				</div>
				<Input type="text" name="legalName" label="Legal Name" value={data.realm?.legalName} placeholder={data.realm?.name} />
				<Input type="select" name="type" label="Type" value={data.realm?.type ?? 'subsidiary'}
					options={{ subsidiary: 'Subsidiary', parent: 'Parent', branch: 'Branch' }} />

				<div class="col-span-2">
					<Input type="textarea" name="description" label="Description" value={data.realm?.description} rows={2} />
				</div>

				<!-- Domain Whitelist -->
				<div class="col-span-2 border-t pt-4">
                    <div class="grid grid-cols-2 gap-4 mb-2">
                        <div>
                            <p class="text-xs font-medium text-gray-700 mb-1">Email Domain Whitelist</p>
                            <p class="text-xs text-gray-500 mb-2">Leave empty to allow all domains.</p>
                        </div>
    					<div class="flex gap-2">
    						<input type="text" bind:value={newDomain} placeholder="e.g. ias.co.id"
    							class="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
    							onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }} />
    						<button type="button" onclick={addDomain}
    							class="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
    							Add
    						</button>
    					</div>
                    </div>

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
				</div>

				{#if !data.isNew}
				<!-- Realm Contact -->
				<div class="col-span-2 border-t pt-4">
					<p class="text-xs font-medium text-gray-700 mb-3">Realm Contact</p>
					<div class="grid grid-cols-2 gap-3">
    					<Input type="text" name="supportEmail" label="Support Email"
    						bind:value={branding.supportEmail} placeholder="support@example.com" />
    					<Input type="text" name="supportUrl" label="Support URL"
    						bind:value={branding.supportUrl} placeholder="https://support.example.com" />
					</div>
				</div>
				<!-- Email Configuration -->
				<div class="col-span-2 border-t pt-4">
					<p class="text-xs font-medium text-gray-700 mb-3">Email Configuration</p>
					<div class="grid grid-cols-2 gap-3">
    					<Input type="text" name="emailFromName" label="From Name"
							bind:value={branding.emailFromName} placeholder={branding.appName || data.realm?.name} />
						<Input type="text" name="emailFromAddress" label="From Email"
							bind:value={branding.emailFromAddress} placeholder="noreply@example.com" />
					</div>
				</div>
				{/if}
			</div>
		</div>
	</form>

	{#if !data.isNew}
	<!-- Email Transport -->
	<div class="bg-white shadow rounded-lg overflow-hidden mb-6">
		<div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
			<div>
				<h2 class="text-lg font-semibold text-gray-900">Email Transport</h2>
				<p class="text-xs text-gray-500 mt-0.5">Fallback chain: realm transport → global Email Settings → none.</p>
			</div>
			<button class="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer text-white rounded-md transition-colors text-sm"
				type="button" onclick={() => { actMailer = { ...data.realm }; }}> Configure </button>
		</div>
		<div class="px-6 py-4 flex items-center gap-6 text-sm">
			<div>
				<p class="text-xs text-gray-500 mb-1">Provider</p>
				{#if (data.realm as any)?.emailTransport?.provider}
					<span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium capitalize">
						{(data.realm as any).emailTransport.provider.replace('_', ' ')}
					</span>
				{:else}
					<span class="text-gray-400 text-xs">Not configured</span>
				{/if}
			</div>
			<div>
				<p class="text-xs text-gray-500 mb-1">From</p>
				<p class="text-gray-700">{branding.emailFromAddress || '—'}</p>
			</div>
		</div>
	</div>
	{/if}

	{#if !data.isNew}
	<!-- Realm Roles -->
	<div class="bg-white shadow rounded-lg overflow-hidden mb-6">
		<div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
			<div>
				<h2 class="text-lg font-semibold text-gray-900">Realm Roles</h2>
				<p class="text-xs text-gray-500">App-access bundles — assign one to an identity's assignment instead of granting apps one by one</p>
			</div>
			<button class="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer text-white rounded-md transition-colors text-sm"
				type="button"
				onclick={() => { actRole = { organizationId: data.realm?._id, name: '', description: '', allowedClientIds: [], isActive: true }; }}>
				+ Realm Role
			</button>
		</div>

		<div class="px-6 py-4 space-y-1">
			{#each data.realmRoles as role}
				<div class="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded">
					<div>
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-gray-800">{role.name}</span>
							{#if !role.isActive}
								<span class="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded">Inactive</span>
							{/if}
						</div>
						{#if role.description}<p class="text-xs text-gray-500">{role.description}</p>{/if}
						<div class="flex flex-wrap gap-1 mt-1">
							{#each clientNames(role.allowedClientIds) as name}
								<span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">{name}</span>
							{:else}
								<span class="text-xs text-gray-400">No apps granted</span>
							{/each}
						</div>
					</div>
					<div class="flex gap-3 shrink-0">
						<button class="text-indigo-600 hover:text-indigo-800 text-xs" type="button"
							onclick={() => (actRole = { ...role })}>Edit</button>
						<button class="text-red-600 hover:text-red-800 text-xs" type="button"
							onclick={() => removeRole(role._id)}>Delete</button>
					</div>
				</div>
			{:else}
				<p class="text-sm text-gray-400 px-1">No realm roles yet for this realm.</p>
			{/each}
		</div>
	</div>

	<!-- Branding -->
	<form method="POST" action="?/updateBranding" use:formEnhance={'Branding saved'}>
		<div class="bg-white shadow rounded-lg overflow-hidden mb-6">
			<div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Branding</h2>
				<button class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
					type="submit"> 💾 Save Branding
				</button>
			</div>
			<div class="px-6 py-4 space-y-6">
				<input type="hidden" name="logoBase64" value={branding.logoBase64} />
				<input type="hidden" name="loginBackgroundBase64" value={branding.loginBackgroundBase64} />

				<Input type="text" name="appName" label="App Name" bind:value={branding.appName} placeholder={data.realm?.name} />

				<!-- Images -->
				<div class="border-t pt-4 space-y-4">
					<p class="text-sm font-medium text-gray-700">Images &amp; Assets</p>

					<div>
						<label class="block text-xs font-medium text-gray-700 mb-2">Logo <span class="text-gray-400">(also favicon, max 2MB)</span></label>
						{#if branding.logoBase64}
							<div class="mb-2 p-3 bg-gray-50 rounded-md border-2 border-dashed border-gray-300 text-center">
								<img src={branding.logoBase64} alt="Logo" class="h-16 w-auto object-contain mx-auto mb-2" />
								<button type="button" onclick={() => (branding.logoBase64 = '')}
									class="text-xs text-red-600 hover:text-red-800">✕ Remove Logo</button>
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
									class="text-xs text-red-600 hover:text-red-800">✕ Remove Background</button>
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

			</div>
		</div>
	</form>

	{/if}
</div>

{#if actRole}
	<RealmRoleModal bind:role={actRole} clients={data.clients} onSaved={() => invalidateAll()} />
{/if}

{#if actMailer}
	<MailerModal bind:form={actMailer} />
{/if}
