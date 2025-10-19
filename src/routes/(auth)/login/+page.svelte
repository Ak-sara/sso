<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import { getBrandingCSS } from '$lib/branding-utils';

	interface Props {
		form?: ActionData;
		data: PageData;
	}

	let { form, data }: Props = $props();
	let isLoading = $state(false);

	// Get branding from server-loaded data
	const branding = $derived(data.branding);
	const brandingCSS = $derived(branding ? getBrandingCSS(branding) : '');
	const appName = $derived(branding?.appName || 'Aksara SSO');
	const logoSrc = $derived(branding?.logoBase64 || '/ias-logo.png');
</script>

<svelte:head>
	{#if brandingCSS}
		{@html `<style>${brandingCSS}</style>`}
	{/if}
	{#if branding?.faviconBase64}
		<link rel="icon" href={branding.faviconBase64} />
	{/if}
	<title>Login - {appName}</title>
</svelte:head>

<div class="w-full max-w-6xl">
	<div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
		<div class="grid lg:grid-cols-2 gap-0">
			<!-- Left Side: Info & Documentation (Desktop) / Bottom (Mobile) -->
			<div class="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 lg:p-12 flex flex-col justify-center order-2 lg:order-1" style={branding?.primaryColor ? `background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor || branding.primaryColor} 100%);` : ''}>
				<div class="text-white">
					<!-- Logo -->
					{#if logoSrc}
						<div class="mb-6">
							<img src={logoSrc} alt="{appName} Logo" class="h-16 object-contain" />
						</div>
					{/if}

					<h2 class="text-3xl font-bold mb-4">Welcome to {appName}</h2>
					<p class="text-white/90 mb-8 leading-relaxed">
						Secure Single Sign-On solution for your organization. Access all your applications with one account.
					</p>

					<!-- Features -->
					<div class="space-y-4 mb-8">
						<div class="flex items-start gap-3">
							<svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<div>
								<h3 class="font-semibold mb-1">OAuth 2.0 / OIDC</h3>
								<p class="text-white/80 text-sm">Industry-standard authentication protocol</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<div>
								<h3 class="font-semibold mb-1">SCIM 2.0 API</h3>
								<p class="text-white/80 text-sm">Automated employee provisioning</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<div>
								<h3 class="font-semibold mb-1">Enterprise Ready</h3>
								<p class="text-white/80 text-sm">Org structure, lifecycle management & sync</p>
							</div>
						</div>
					</div>

					<!-- Documentation Link -->
					<div class="p-4 bg-white/10 backdrop-blur-sm rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<span>📚</span>
							<span class="font-semibold">Developer Documentation</span>
						</div>
						<p class="text-white/80 text-sm mb-3">
							Complete integration guides, API reference, and examples
						</p>
						<a href="/docs" class="inline-flex items-center gap-2 text-white font-medium hover:opacity-80 transition-opacity">
							View Documentation
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</a>
					</div>

					<!-- Test Credentials (Dev Only) -->
					<div class="mt-6 p-4 bg-black/20 backdrop-blur-sm rounded-lg text-sm">
						<p class="font-medium mb-2">🧪 Test Login Options:</p>
						<p class="font-mono mb-1">Email: admin@ias.co.id</p>
						<p class="font-mono mb-1">Or NIK: (employee's NIK)</p>
						<p class="font-mono">Password: password123</p>
					</div>
				</div>
			</div>

			<!-- Right Side: Login Form (Desktop) / Top (Mobile) -->
			<div class="p-8 lg:p-12 flex flex-col justify-center order-1 lg:order-2">
				<!-- Title -->
				<div class="mb-8">
					<h1 class="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
					<p class="text-gray-600">Enter your credentials to continue</p>
				</div>

		<!-- Error Message -->
		{#if form?.error}
			<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
				<div class="flex items-start">
					<span class="text-red-500 mr-2">⚠️</span>
					<p class="text-sm text-red-700">{form.error}</p>
				</div>
			</div>
		{/if}

		<!-- Login Form -->
		<form method="POST" use:enhance={() => {
			isLoading = true;
			return async ({ update }) => {
				await update();
				isLoading = false;
			};
		}}>
			<!-- Username/Email/NIK Field -->
			<div class="mb-4">
				<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
					Email / NIK
				</label>
				<input
					type="text"
					id="email"
					name="email"
					value={form?.email ?? ''}
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
					style="--tw-ring-color: {branding?.primaryColor || '#4f46e5'};"
					placeholder="email@company.com or NIK123456"
					autocomplete="username"
				/>
				<p class="mt-1 text-xs text-gray-500">
					You can use either your email address or NIK (Employee ID)
				</p>
			</div>

			<!-- Password Field -->
			<div class="mb-6">
				<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
					Password
				</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
					style="--tw-ring-color: {branding?.primaryColor || '#4f46e5'};"
					placeholder="••••••••"
				/>
			</div>

			<!-- Remember Me & Forgot Password -->
			<div class="flex items-center justify-between mb-6">
				<label class="flex items-center">
					<input
						type="checkbox"
						name="remember"
						disabled={isLoading}
						class="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:outline-none disabled:cursor-not-allowed"
						style="color: {branding?.primaryColor || '#4f46e5'}; --tw-ring-color: {branding?.primaryColor || '#4f46e5'};"
					/>
					<span class="ml-2 text-sm text-gray-600">Ingat saya</span>
				</label>
				<a href="/forgot-password" class="text-sm brand-text-primary font-medium hover:opacity-80 transition-opacity">
					Lupa password?
				</a>
			</div>

			<!-- Submit Button -->
			<button
				type="submit"
				disabled={isLoading}
				class="w-full brand-bg-primary brand-bg-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
			>
				{#if isLoading}
					<span class="inline-block animate-spin mr-2">⏳</span>
					Memproses...
				{:else}
					Masuk
				{/if}
			</button>
		</form>

				<!-- Footer -->
				<div class="mt-8 text-center text-sm text-gray-600">
					<p>Need an account? <a href="/register" class="brand-text-primary font-medium hover:opacity-80 transition-opacity">Contact your administrator</a></p>
				</div>
			</div>
		</div>
	</div>
</div>
