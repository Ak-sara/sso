<script lang="ts">
	import type { PageData } from './$types';
	import { getBrandingCSS } from '$lib/branding-utils';
	import { formEnhance } from '$lib/utils/form-enhance';

	export let data: PageData;

	let showPassword = false;

	// Default branding if not available
	const defaultBranding = {
		appName: 'Aksara SSO',
		primaryColor: '#4f46e5',
		secondaryColor: '#7c3aed',
		accentColor: '#06b6d4',
		backgroundColor: '#f9fafb',
		textColor: '#ffffff'
	};

	$: branding = data.branding || defaultBranding;
	$: brandingCSS = getBrandingCSS(branding);
	$: primaryColor = branding.primaryColor || '#4f46e5';
</script>

<svelte:head>
	<title>{branding.appName} - Sign In</title>
	{#if branding.logoBase64}
		<link rel="icon" type="image/png" href={branding.logoBase64} />
	{:else}
		<link rel="icon" type="image/png" href="/ias-logo.png" />
	{/if}
	{@html `<style>${brandingCSS}</style>`}
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		{#if branding.logoBase64}
			<img class="mx-auto h-16 w-auto" src={branding.logoBase64} alt={branding.appName} />
		{/if}
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
			{#if data.isLoggedIn}
				Authorize Application
			{:else}
				Sign in to your account
			{/if}
		</h2>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			{#if !data.isLoggedIn}
				<form method="POST" use:formEnhance class="space-y-6">
					<input type="hidden" name="action" value="login" />
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700">
							Email / NIK
						</label>
						<div class="mt-1">
							<input
								id="email"
								name="email"
								type="text"
								autocomplete="username"
								required
								placeholder="email@company.com or NIK123456"
								class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							/>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							You can use either your email address or NIK (Employee ID)
						</p>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700">
							Password
						</label>
						<div class="mt-1 relative">
							<input class="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								autocomplete="current-password"
								required />
							<button type="button" onclick={() => showPassword = !showPassword}
								class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
								aria-label={showPassword ? 'Hide password' : 'Show password'}>
								{#if showPassword}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
									</svg>
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					<div>
						<button class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white brand-bg-primary brand-bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
							type="submit" > Sign in </button>
						<p class="mt-3 text-center text-sm text-gray-500">
							<a href="/forgot-password" class="text-indigo-600 hover:text-indigo-800 hover:underline">
								Forgot your password?
							</a>
						</p>
					</div>
				</form>
			{:else}
				<div class="space-y-6">
					<div class="text-center">
						<h3 class="text-lg font-medium text-gray-900">Hello, {data.user?.name}</h3>
						<p class="mt-1 text-sm text-gray-600">
							<strong>{data.client.name}</strong> is requesting access to your account.
						</p>
						<form method="POST" class="mt-2">
							<input type="hidden" name="action" value="clearSession" />
							<button type="submit" class="text-xs text-indigo-600 hover:text-indigo-800 hover:underline">
								Not you?
							</button>
						</form>
					</div>

					<div class="bg-gray-50 p-4 rounded-md">
						<h4 class="text-sm font-medium text-gray-900 mb-2">Requested permissions:</h4>
						<ul class="text-sm text-gray-600 space-y-1">
							{#each (data.params.scope || 'openid').split(' ') as scope}
								<li>• {scope}</li>
							{/each}
						</ul>
					</div>

					<form method="POST" use:formEnhance class="space-y-4">
						<button
							type="submit"
							class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white brand-bg-primary brand-bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						>
							Authorize
						</button>

						<a
							href="{data.params.redirect_uri}?error=access_denied&error_description=User+cancelled+authorization{data.params.state ? `&state=${data.params.state}` : ''}"
							class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						>
							Cancel
						</a>
					</form>
				</div>
			{/if}
		</div>
	</div>
</div>

