<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let showBackupCodes = $state(false);
</script>

<svelte:head>
	<title>Two-Factor Authentication - Aksara SSO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="text-2xl font-bold text-gray-900">Two-Factor Authentication (2FA)</h2>
		<p class="text-sm text-gray-500 mt-1">Add an extra layer of security to your account</p>
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

	{#if form?.message && !form?.error}
		<div class="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-md">
			{form.message}
		</div>
	{/if}

	<!-- Backup Codes Display -->
	{#if form?.backupCodes}
		<div class="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
			<div class="flex items-start gap-3 mb-4">
				<span class="text-3xl">⚠️</span>
				<div>
					<h3 class="text-lg font-bold text-yellow-900">Save Your Backup Codes!</h3>
					<p class="text-sm text-yellow-800 mt-1">
						Store these codes in a safe place. You can use them to access your account if you lose access to your email.
						<strong>These codes will only be shown once!</strong>
					</p>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-3 mb-4">
				{#each form.backupCodes as code, i}
					<div class="bg-white border border-yellow-300 rounded px-3 py-2 font-mono text-center text-lg">
						{i + 1}. {code}
					</div>
				{/each}
			</div>

			<button
				onclick={() => {
					const text = form.backupCodes?.join('\n') || '';
					navigator.clipboard.writeText(text);
					alert('Backup codes copied to clipboard!');
				}}
				class="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
			>
				📋 Copy All Codes
			</button>
		</div>
	{/if}

	<!-- 2FA Status -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex items-center justify-between mb-4">
			<div>
				<h3 class="text-lg font-medium text-gray-900">Status</h3>
				<p class="text-sm text-gray-500">
					2FA is currently {data.status2FA?.enabled ? 'enabled' : 'disabled'}
				</p>
			</div>
			<span
				class="px-3 py-1 text-xs font-semibold rounded-full {data.status2FA?.enabled
					? 'bg-green-100 text-green-800'
					: 'bg-gray-100 text-gray-800'}"
			>
				{data.status2FA?.enabled ? 'Enabled' : 'Disabled'}
			</span>
		</div>

		{#if data.status2FA?.enabled}
			<div class="space-y-3 mb-4">
				<div class="flex justify-between items-center p-3 bg-gray-50 rounded">
					<span class="text-sm text-gray-700">Method</span>
					<span class="text-sm font-medium text-gray-900">Email OTP</span>
				</div>
				<div class="flex justify-between items-center p-3 bg-gray-50 rounded">
					<span class="text-sm text-gray-700">Backup Codes</span>
					<span class="text-sm font-medium text-gray-900">
						{data.status2FA.backupCodesCount} remaining
					</span>
				</div>
				{#if data.status2FA.enabledAt}
					<div class="flex justify-between items-center p-3 bg-gray-50 rounded">
						<span class="text-sm text-gray-700">Enabled Since</span>
						<span class="text-sm font-medium text-gray-900">
							{new Date(data.status2FA.enabledAt).toLocaleDateString()}
						</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Info Box -->
		<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
			<p class="text-sm text-blue-800">
				<strong>How it works:</strong><br />
				When 2FA is enabled, you'll receive a one-time code via email each time you log in. This provides an extra layer of security beyond your password.
			</p>
		</div>

		<!-- Enable/Disable Forms -->
		{#if !data.status2FA?.enabled}
			<!-- Enable 2FA Form -->
			<form method="POST" action="?/enable" use:enhance class="space-y-4">
				{#if form?.otpSent}
					<div>
						<label for="otpCode" class="block text-sm font-medium text-gray-700 mb-1">
							Enter OTP Code
						</label>
						<input
							type="text"
							id="otpCode"
							name="otpCode"
							required
							maxlength="6"
							placeholder="000000"
							class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						/>
						<p class="text-xs text-gray-500 mt-1">Check your email for the verification code</p>
					</div>
				{/if}

				<button
					type="submit"
					class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700"
				>
					{form?.otpSent ? 'Verify and Enable 2FA' : 'Enable 2FA'}
				</button>
			</form>
		{:else}
			<!-- Disable 2FA Form -->
			<form method="POST" action="?/disable" use:enhance class="space-y-4">
				{#if form?.disableOtpSent}
					<div>
						<label for="otpCode" class="block text-sm font-medium text-gray-700 mb-1">
							Enter OTP Code
						</label>
						<input
							type="text"
							id="otpCode"
							name="otpCode"
							required
							maxlength="6"
							placeholder="000000"
							class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						/>
						<p class="text-xs text-gray-500 mt-1">Enter the code sent to your email</p>
					</div>
				{/if}

				<button
					type="submit"
					class="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
				>
					{form?.disableOtpSent ? 'Verify and Disable 2FA' : 'Disable 2FA'}
				</button>
			</form>

			<!-- Regenerate Backup Codes -->
			<form method="POST" action="?/regenerateBackupCodes" use:enhance class="mt-4">
				<button
					type="submit"
					class="w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50"
				>
					🔄 Regenerate Backup Codes
				</button>
			</form>
		{/if}
	</div>

	<!-- Security Tips -->
	<div class="bg-gray-50 rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-3">Security Tips</h3>
		<ul class="space-y-2 text-sm text-gray-600">
			<li class="flex items-start gap-2">
				<span class="text-green-600">✓</span>
				<span>2FA significantly reduces the risk of unauthorized access</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-green-600">✓</span>
				<span>Save your backup codes in a secure password manager</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-green-600">✓</span>
				<span>Never share your OTP codes with anyone</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-green-600">✓</span>
				<span>Keep your email account secure with a strong password</span>
			</li>
		</ul>
	</div>
</div>
