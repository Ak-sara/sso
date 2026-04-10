<script lang="ts">
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:realm-branding' });

	interface Props {
		realm: any;
		onSave: () => void;
	}

	let { realm = $bindable(), onSave }: Props = $props();

	async function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = error => reject(error);
		});
	}

	async function handleLogoUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			if (!file.type.startsWith('image/')) {
				alert('Please upload an image file');
				return;
			}
			if (file.size > 2 * 1024 * 1024) {
				alert('Logo file size must be less than 2MB');
				return;
			}
			try {
				realm.branding.logoBase64 = await fileToBase64(file);
			} catch (error) {
				log.error('Error uploading logo', { error });
				alert('Failed to upload logo');
			}
		}
	}

	async function handleBackgroundUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			if (!file.type.startsWith('image/')) {
				alert('Please upload an image file');
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				alert('Background file size must be less than 5MB');
				return;
			}
			try {
				realm.branding.loginBackgroundBase64 = await fileToBase64(file);
			} catch (error) {
				log.error('Error uploading background', { error });
				alert('Failed to upload background');
			}
		}
	}
</script>

<!-- Content -->
<div class="p-6 space-y-6">
	<!-- Info -->
	<div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
		<div class="flex items-start gap-3">
			<span class="text-2xl">💡</span>
			<div class="flex-1">
				<h4 class="text-sm font-semibold text-purple-900 mb-1">Customize Your SSO Experience</h4>
				<p class="text-sm text-purple-800">
					Configure branding elements that will be displayed on login pages, emails, and user-facing SSO interfaces for this realm.
				</p>
			</div>
		</div>
	</div>

	<!-- App Name -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">App Name</label>
		<input
			type="text"
			bind:value={realm.branding.appName}
			placeholder={realm.name}
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
		/>
		<p class="text-xs text-gray-500 mt-1">Display name shown in SSO pages and emails</p>
	</div>

	<!-- Images Section -->
	<div class="border-t pt-6">
		<h4 class="text-md font-semibold text-gray-800 mb-4">Images & Assets</h4>

		<!-- Logo Upload -->
		<div class="mb-6">
			<label class="block text-sm font-medium text-gray-700 mb-2">
				Logo <span class="text-gray-500 text-xs">(also used as favicon)</span>
			</label>
			{#if realm.branding.logoBase64}
				<div class="mb-3 p-4 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
					<img
						src={realm.branding.logoBase64}
						alt="Logo preview"
						class="h-20 w-auto object-contain mx-auto mb-2"
					/>
					<button
						type="button"
						onclick={() => (realm.branding.logoBase64 = undefined)}
						class="w-full text-xs text-red-600 hover:text-red-800 font-medium"
					>
						✕ Remove Logo
					</button>
				</div>
			{/if}
			<input
				type="file"
				accept="image/*"
				onchange={handleLogoUpload}
				class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
			/>
			<p class="text-xs text-gray-500 mt-1">PNG, JPG, SVG (max 2MB) - Will be used for both logo and favicon</p>
		</div>

		<!-- Login Background -->
		<div class="mt-6">
			<label class="block text-sm font-medium text-gray-700 mb-2">Login Background Image</label>
			{#if realm.branding.loginBackgroundBase64}
				<div class="mb-3 p-4 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
					<img
						src={realm.branding.loginBackgroundBase64}
						alt="Background preview"
						class="h-32 w-full object-cover rounded mx-auto mb-2"
					/>
					<button
						type="button"
						onclick={() => (realm.branding.loginBackgroundBase64 = undefined)}
						class="w-full text-xs text-red-600 hover:text-red-800 font-medium"
					>
						✕ Remove Background
					</button>
				</div>
			{/if}
			<input
				type="file"
				accept="image/*"
				onchange={handleBackgroundUpload}
				class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
			/>
			<p class="text-xs text-gray-500 mt-1">PNG, JPG (max 5MB, recommended 1920x1080px)</p>
		</div>
	</div>

	<!-- Colors Section -->
	<div class="border-t pt-6">
		<h4 class="text-md font-semibold text-gray-800 mb-4">Color Scheme</h4>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
				<div class="flex gap-2">
					<input
						type="color"
						bind:value={realm.branding.primaryColor}
						class="h-12 w-16 rounded border border-gray-300 cursor-pointer"
					/>
					<input
						type="text"
						bind:value={realm.branding.primaryColor}
						placeholder="#4f46e5"
						class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
					/>
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
				<div class="flex gap-2">
					<input
						type="color"
						bind:value={realm.branding.secondaryColor}
						class="h-12 w-16 rounded border border-gray-300 cursor-pointer"
					/>
					<input
						type="text"
						bind:value={realm.branding.secondaryColor}
						placeholder="#7c3aed"
						class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
					/>
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
				<div class="flex gap-2">
					<input
						type="color"
						bind:value={realm.branding.accentColor}
						class="h-12 w-16 rounded border border-gray-300 cursor-pointer"
					/>
					<input
						type="text"
						bind:value={realm.branding.accentColor}
						placeholder="#06b6d4"
						class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
					/>
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Button Text Color</label>
				<div class="flex gap-2">
					<input
						type="color"
						bind:value={realm.branding.textColor}
						class="h-12 w-16 rounded border border-gray-300 cursor-pointer"
					/>
					<input
						type="text"
						bind:value={realm.branding.textColor}
						placeholder="#ffffff"
						class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
					/>
				</div>
			</div>
		</div>

		<!-- Color Preview -->
		<div class="mt-6 p-4 bg-gray-50 rounded-lg">
			<h5 class="text-sm font-medium text-gray-700 mb-3">Color Preview</h5>
			<div class="grid grid-cols-4 gap-3">
				<div class="text-center">
					<div
						class="h-20 rounded-lg shadow-sm mb-2 border border-gray-200"
						style="background-color: {realm.branding.primaryColor}"
					></div>
					<p class="text-xs font-medium text-gray-600">Primary</p>
				</div>
				<div class="text-center">
					<div
						class="h-20 rounded-lg shadow-sm mb-2 border border-gray-200"
						style="background-color: {realm.branding.secondaryColor}"
					></div>
					<p class="text-xs font-medium text-gray-600">Secondary</p>
				</div>
				<div class="text-center">
					<div
						class="h-20 rounded-lg shadow-sm mb-2 border border-gray-200"
						style="background-color: {realm.branding.accentColor}"
					></div>
					<p class="text-xs font-medium text-gray-600">Accent</p>
				</div>
				<div class="text-center">
					<div
						class="h-20 rounded-lg shadow-sm mb-2 flex items-center justify-center font-medium border border-gray-200"
						style="background-color: {realm.branding.primaryColor}; color: {realm.branding.textColor}"
					>
						Button
					</div>
					<p class="text-xs font-medium text-gray-600">Button</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Email Configuration -->
	<div class="border-t pt-6">
		<h4 class="text-md font-semibold text-gray-800 mb-4">Email Configuration</h4>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">From Name</label>
				<input
					type="text"
					bind:value={realm.branding.emailFromName}
					placeholder={realm.branding.appName || realm.name}
					class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">From Email Address</label>
				<input
					type="email"
					bind:value={realm.branding.emailFromAddress}
					placeholder="noreply@example.com"
					class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
				<input
					type="email"
					bind:value={realm.branding.supportEmail}
					placeholder="support@example.com"
					class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Support URL</label>
				<input
					type="url"
					bind:value={realm.branding.supportUrl}
					placeholder="https://support.example.com"
					class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
				/>
			</div>
		</div>
	</div>
</div>

<!-- Footer -->
<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
	<button
		onclick={onSave}
		class="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 font-medium shadow-sm"
	>
		💾 Save Branding
	</button>
</div>
