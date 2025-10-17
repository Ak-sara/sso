<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let logoFile = $state<File | null>(null);
	let faviconFile = $state<File | null>(null);
	let logoPreview = $state(data.organization.branding?.logoBase64 || '');
	let faviconPreview = $state(data.organization.branding?.faviconBase64 || '');

	async function handleLogoUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			logoFile = input.files[0];
			const reader = new FileReader();
			reader.onload = (e) => {
				logoPreview = e.target?.result as string;
			};
			reader.readAsDataURL(logoFile);
		}
	}

	async function handleFaviconUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			faviconFile = input.files[0];
			const reader = new FileReader();
			reader.onload = (e) => {
				faviconPreview = e.target?.result as string;
			};
			reader.readAsDataURL(faviconFile);
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a href="/realms" class="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
			← Kembali ke Realms
		</a>
		<h2 class="mt-2 text-2xl font-bold text-gray-900">
			Branding - {data.organization.name}
		</h2>
		<p class="mt-1 text-sm text-gray-500">
			Kelola tampilan visual untuk organisasi ini
		</p>
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

	<form method="POST" action="?/update" use:enhance class="space-y-6">
		<!-- Logo & Favicon Section -->
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Branding Visual</h3>

			<div class="grid gap-6 md:grid-cols-2">
				<!-- Logo Upload -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Logo Aplikasi
					</label>
					{#if logoPreview}
						<div class="mb-4">
							<img src={logoPreview} alt="Logo preview" class="h-16 border border-gray-300 rounded" />
						</div>
					{/if}
					<input
						type="file"
						accept="image/*"
						onchange={handleLogoUpload}
						class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
					/>
					<input type="hidden" name="logoBase64" value={logoPreview} />
					<p class="mt-1 text-xs text-gray-500">PNG, JPG, SVG (Maks. 2MB)</p>
				</div>

				<!-- Favicon Upload -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Favicon
					</label>
					{#if faviconPreview}
						<div class="mb-4">
							<img src={faviconPreview} alt="Favicon preview" class="h-8 border border-gray-300 rounded" />
						</div>
					{/if}
					<input
						type="file"
						accept="image/*"
						onchange={handleFaviconUpload}
						class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
					/>
					<input type="hidden" name="faviconBase64" value={faviconPreview} />
					<p class="mt-1 text-xs text-gray-500">PNG, ICO (32x32 atau 64x64)</p>
				</div>
			</div>
		</div>

		<!-- App Name & Colors -->
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Nama & Warna</h3>

			<div class="grid gap-6 md:grid-cols-2">
				<!-- App Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Nama Aplikasi</label>
					<input
						type="text"
						name="appName"
						value={data.organization.branding?.appName || data.organization.name}
						required
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					/>
				</div>

				<!-- Primary Color -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Warna Utama</label>
					<div class="mt-1 flex items-center space-x-2">
						<input
							type="color"
							name="primaryColor"
							value={data.organization.branding?.primaryColor || '#4f46e5'}
							class="h-10 w-20 border border-gray-300 rounded cursor-pointer"
						/>
						<input
							type="text"
							value={data.organization.branding?.primaryColor || '#4f46e5'}
							disabled
							class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
						/>
					</div>
				</div>

				<!-- Secondary Color -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Warna Sekunder</label>
					<div class="mt-1 flex items-center space-x-2">
						<input
							type="color"
							name="secondaryColor"
							value={data.organization.branding?.secondaryColor || '#6366f1'}
							class="h-10 w-20 border border-gray-300 rounded cursor-pointer"
						/>
						<input
							type="text"
							value={data.organization.branding?.secondaryColor || '#6366f1'}
							disabled
							class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
						/>
					</div>
				</div>

				<!-- Accent Color -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Warna Aksen (Opsional)</label>
					<div class="mt-1 flex items-center space-x-2">
						<input
							type="color"
							name="accentColor"
							value={data.organization.branding?.accentColor || '#8b5cf6'}
							class="h-10 w-20 border border-gray-300 rounded cursor-pointer"
						/>
						<input
							type="text"
							value={data.organization.branding?.accentColor || '#8b5cf6'}
							disabled
							class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
						/>
					</div>
				</div>
			</div>
		</div>

		<!-- Email Settings -->
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Pengaturan Email</h3>

			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<label class="block text-sm font-medium text-gray-700">Nama Pengirim</label>
					<input
						type="text"
						name="emailFromName"
						value={data.organization.branding?.emailFromName || data.organization.name}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700">Email Pengirim</label>
					<input
						type="email"
						name="emailFromAddress"
						value={data.organization.branding?.emailFromAddress || 'no-reply@' + data.organization.code.toLowerCase() + '.co.id'}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					/>
				</div>

				<div class="md:col-span-2">
					<label class="block text-sm font-medium text-gray-700">Email Support</label>
					<input
						type="email"
						name="supportEmail"
						value={data.organization.branding?.supportEmail || 'support@' + data.organization.code.toLowerCase() + '.co.id'}
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					/>
				</div>
			</div>
		</div>

		<!-- Preview -->
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Preview</h3>

			<div class="border border-gray-300 rounded-lg p-4">
				<div class="flex items-center space-x-4 mb-4">
					{#if logoPreview}
						<img src={logoPreview} alt="Logo" class="h-12" />
					{/if}
					<h4 class="text-2xl font-bold" style="color: {data.organization.branding?.primaryColor || '#4f46e5'}">
						{data.organization.branding?.appName || data.organization.name}
					</h4>
				</div>

				<button
					type="button"
					class="px-4 py-2 rounded-md text-white font-medium"
					style="background-color: {data.organization.branding?.primaryColor || '#4f46e5'}"
				>
					Sample Button
				</button>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex justify-end space-x-3">
			<a
				href="/realms"
				class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
			>
				Batal
			</a>
			<button
				type="submit"
				class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			>
				Simpan Branding
			</button>
		</div>
	</form>
</div>
