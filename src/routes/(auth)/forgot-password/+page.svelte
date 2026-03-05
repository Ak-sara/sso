<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Forgot Password - Aksara SSO</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full">
		<div class="bg-white shadow-2xl rounded-2xl p-8">
			<!-- Logo/Header -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900">🔐 Aksara SSO</h1>
				<p class="mt-2 text-sm text-gray-600">Reset Your Password</p>
			</div>

			{#if form?.success}
				<!-- Success Message -->
				<div class="text-center">
					<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
						<svg class="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
					<p class="text-gray-600 mb-6">{form.success}</p>

					<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
						<p class="text-sm text-blue-800">
							<strong>📧 Next Steps:</strong><br>
							1. Check your inbox (and spam folder)<br>
							2. Click the reset link in the email<br>
							3. Create your new password<br><br>
							<strong>⏱️ Link expires in 1 hour</strong>
						</p>
					</div>

					<a
						href="/login"
						class="block w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-center"
					>
						Back to Sign In
					</a>
				</div>

			{:else}
				<!-- Form -->
				{#if form?.error}
					<div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
						{form.error}
					</div>
				{/if}

				<div class="mb-6">
					<p class="text-gray-600 text-sm">
						Enter your email address and we'll send you a link to reset your password.
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
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
							Email Address
						</label>
						<input
							type="email"
							id="email"
							name="email"
							value={form?.email || ''}
							required
							placeholder="your.email@example.com"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{#if isSubmitting}
							Sending...
						{:else}
							Send Reset Link
						{/if}
					</button>
				</form>

				<div class="mt-6 text-center space-y-2">
					<a href="/login" class="block text-sm text-indigo-600 hover:text-indigo-800 font-medium">
						← Back to Sign In
					</a>
					<a href="/register" class="block text-sm text-gray-600 hover:text-gray-800">
						Don't have an account? <span class="font-medium text-indigo-600">Sign Up</span>
					</a>
				</div>

				<!-- Info Box -->
				<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<p class="text-sm text-blue-800">
						<strong>🔒 Security:</strong><br>
						• Reset links expire after 1 hour<br>
						• You can request a new link every 5 minutes<br>
						• Your password remains unchanged until you complete the reset
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
