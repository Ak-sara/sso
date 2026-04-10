<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Passwordless Login - Aksara SSO</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full">
		<div class="bg-white shadow-2xl rounded-2xl p-8">
			<!-- Logo/Header -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900">🔐 Aksara SSO</h1>
				<p class="mt-2 text-sm text-gray-600">Passwordless Login</p>
			</div>

			<!-- Success/Error Messages -->
			{#if form?.error}
				<div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
					{form.error}
				</div>
			{/if}

			{#if form?.message && !form?.error}
				<div class="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-md mb-4">
					{form.message}
				</div>
			{/if}

			{#if !form?.otpSent}
				<!-- Step 1: Enter Email -->
				<div class="mb-6">
					<p class="text-gray-600 text-sm">
						Enter your email address and we'll send you a one-time code to sign in.
					</p>
				</div>

				<form
					method="POST"
					action="?/sendOTP"
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
							Sending Code...
						{:else}
							Send Login Code
						{/if}
					</button>
				</form>
			{:else}
				<!-- Step 2: Enter OTP -->
				<div class="mb-6">
					<div class="flex items-center gap-3 p-3 bg-gray-50 rounded mb-4">
						<svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						<span class="font-medium text-gray-900">{form.email}</span>
					</div>
					<p class="text-gray-600 text-sm">
						Enter the 6-digit code we sent to your email.
					</p>
				</div>

				<form
					method="POST"
					action="?/verifyOTP"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="email" value={form.email} />

					<div>
						<label for="otpCode" class="block text-sm font-medium text-gray-700 mb-1">
							Login Code
						</label>
						<input
							type="text"
							id="otpCode"
							name="otpCode"
							required
							maxlength="6"
							placeholder="000000"
							autofocus
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
						/>
						<p class="text-xs text-gray-500 mt-1">Code expires in 10 minutes</p>
					</div>

					<div class="flex gap-3">
						<a
							href="/login-otp"
							class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-center"
						>
							Change Email
						</a>
						<button
							type="submit"
							disabled={isSubmitting}
							class="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{#if isSubmitting}
								Verifying...
							{:else}
								Sign In
							{/if}
						</button>
					</div>
				</form>

				<!-- Resend OTP -->
				<form method="POST" action="?/sendOTP" use:enhance class="mt-4">
					<input type="hidden" name="email" value={form.email} />
					<button
						type="submit"
						class="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium"
					>
						Didn't receive the code? Resend
					</button>
				</form>
			{/if}

			<!-- Navigation Links -->
			<div class="mt-6 text-center space-y-2">
				<a href="/login" class="block text-sm text-gray-600 hover:text-gray-800">
					← Back to Password Login
				</a>
				<a href="/register" class="block text-sm text-gray-600 hover:text-gray-800">
					Don't have an account? <span class="font-medium text-indigo-600">Sign Up</span>
				</a>
			</div>

			<!-- Info Box -->
			<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<p class="text-sm text-blue-800">
					<strong>Passwordless Login:</strong><br>
					No password needed! Just enter your email and we'll send you a secure code to sign in.
				</p>
			</div>
		</div>
	</div>
</div>
