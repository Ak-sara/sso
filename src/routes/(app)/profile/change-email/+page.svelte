<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
</script>

<svelte:head>
	<title>Change Email - Aksara SSO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="text-2xl font-bold text-gray-900">Change Email Address</h2>
		<p class="text-sm text-gray-500 mt-1">Update your email address with OTP verification</p>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
			{form.message}
		</div>
	{/if}

	{#if form?.error}
		<div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
			{form.error}
		</div>
	{/if}

	{#if form?.otpSent && !form?.error}
		<div class="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-md">
			{form.message}
		</div>
	{/if}

	<!-- Current Email -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Current Email</h3>
		<div class="flex items-center gap-3 p-3 bg-gray-50 rounded">
			<svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
			</svg>
			<span class="font-medium text-gray-900">{data.currentEmail}</span>
		</div>
	</div>

	<!-- Change Email Form -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Change to New Email</h3>

		{#if !form?.otpSent}
			<!-- Step 1: Enter New Email -->
			<form method="POST" action="?/sendOTP" use:enhance class="space-y-4">
				<div>
					<label for="newEmail" class="block text-sm font-medium text-gray-700 mb-1">
						New Email Address
					</label>
					<input
						type="email"
						id="newEmail"
						name="newEmail"
						value={form?.newEmail || ''}
						required
						placeholder="new.email@example.com"
						class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 mt-1">
						We'll send a verification code to this email
					</p>
				</div>

				<button
					type="submit"
					class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700"
				>
					Send Verification Code
				</button>
			</form>
		{:else}
			<!-- Step 2: Verify OTP -->
			<form method="POST" action="?/verifyAndChange" use:enhance class="space-y-4">
				<input type="hidden" name="newEmail" value={form.newEmail} />

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">
						New Email Address
					</label>
					<div class="flex items-center gap-3 p-3 bg-gray-50 rounded">
						<svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						<span class="font-medium text-gray-900">{form.newEmail}</span>
					</div>
				</div>

				<div>
					<label for="otpCode" class="block text-sm font-medium text-gray-700 mb-1">
						Verification Code
					</label>
					<input
						type="text"
						id="otpCode"
						name="otpCode"
						required
						maxlength="6"
						placeholder="000000"
						class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 mt-1">
						Enter the 6-digit code sent to your new email
					</p>
				</div>

				<div class="flex gap-3">
					<a
						href="/profile/change-email"
						class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 text-center"
					>
						Cancel
					</a>
					<button
						type="submit"
						class="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700"
					>
						Verify and Change
					</button>
				</div>
			</form>
		{/if}
	</div>

	<!-- Security Notice -->
	<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
		<div class="flex items-start gap-3">
			<span class="text-2xl">⚠️</span>
			<div>
				<h4 class="text-sm font-semibold text-yellow-900 mb-1">Important Security Notice</h4>
				<ul class="text-sm text-yellow-800 space-y-1">
					<li>• Changing your email will update your login credentials</li>
					<li>• You'll receive a verification code at the new email address</li>
					<li>• All active sessions will remain active with the new email</li>
					<li>• Make sure you have access to the new email before proceeding</li>
				</ul>
			</div>
		</div>
	</div>
</div>
