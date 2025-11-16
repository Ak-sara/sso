<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let isSubmitting = $state(false);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
</script>

<svelte:head>
	<title>Reset Password - Aksara SSO</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full">
		<div class="bg-white shadow-2xl rounded-2xl p-8">
			<!-- Logo/Header -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900">🔐 Aksara SSO</h1>
				<p class="mt-2 text-sm text-gray-600">Create New Password</p>
			</div>

			{#if data.status === 'error'}
				<!-- Error State -->
				<div class="text-center">
					<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
						<svg class="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
					<p class="text-gray-600 mb-6">{data.message}</p>

					<div class="space-y-3">
						<a
							href="/auth/forgot-password"
							class="block w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-center"
						>
							Request New Reset Link
						</a>
						<a
							href="/login"
							class="block w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
						>
							Back to Sign In
						</a>
					</div>
				</div>

			{:else}
				<!-- Valid Token - Show Reset Form -->
				{#if form?.error}
					<div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
						{form.error}
					</div>
				{/if}

				<div class="mb-6">
					<p class="text-gray-600 text-sm">
						Create a strong password for your account: <strong>{data.email}</strong>
					</p>
				</div>

				<form
					method="POST"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="token" value={data.token} />

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
							New Password
						</label>
						<div class="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								id="password"
								name="password"
								required
								minlength="8"
								placeholder="Enter new password"
								class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							<button
								type="button"
								onclick={() => showPassword = !showPassword}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
							>
								{#if showPassword}
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								{:else}
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
									</svg>
								{/if}
							</button>
						</div>
						<p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
					</div>

					<div>
						<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
							Confirm New Password
						</label>
						<div class="relative">
							<input
								type={showConfirmPassword ? 'text' : 'password'}
								id="confirmPassword"
								name="confirmPassword"
								required
								minlength="8"
								placeholder="Confirm new password"
								class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							<button
								type="button"
								onclick={() => showConfirmPassword = !showConfirmPassword}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
							>
								{#if showConfirmPassword}
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								{:else}
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{#if isSubmitting}
							Resetting Password...
						{:else}
							Reset Password
						{/if}
					</button>
				</form>

				<!-- Password Requirements -->
				<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<p class="text-sm text-blue-800">
						<strong>💡 Password Tips:</strong><br>
						• Use at least 8 characters<br>
						• Mix uppercase and lowercase letters<br>
						• Include numbers and symbols<br>
						• Avoid common words or patterns
					</p>
				</div>

				<div class="mt-4 text-center">
					<a href="/login" class="text-sm text-gray-600 hover:text-gray-800">
						← Back to Sign In
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>
