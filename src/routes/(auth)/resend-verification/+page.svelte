<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Resend Verification Email - Aksara SSO</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full">
		<div class="bg-white shadow-2xl rounded-2xl p-8">
			<!-- Logo/Header -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900">🔐 Aksara SSO</h1>
				<p class="mt-2 text-sm text-gray-600">Resend Verification Email</p>
			</div>

			{#if form?.success}
				<!-- Success Message -->
				<div class="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md mb-4">
					<div class="flex items-start">
						<svg class="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						<div>
							<p class="font-medium">{form.success}</p>
						</div>
					</div>
				</div>

				<div class="space-y-3">
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
						Didn't receive the verification email? Enter your email address below and we'll send you a new verification link.
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
							Send Verification Email
						{/if}
					</button>
				</form>

				<div class="mt-6 text-center">
					<a href="/login" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
						← Back to Sign In
					</a>
				</div>

				<!-- Info Box -->
				<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<p class="text-sm text-blue-800">
						<strong>💡 Tips:</strong><br>
						• Check your spam/junk folder<br>
						• Verification links expire after 24 hours<br>
						• You can request a new link every 5 minutes
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
