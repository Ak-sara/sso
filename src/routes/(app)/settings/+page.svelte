<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let isEditing = $state(false);
	let editedSettings: Record<string, any> = $state({});
	let emailProvider = $state('nodemailer');
	let emailConfig = $state({
		gmail: { user: '', appPassword: '', fromName: '' },
		microsoft365: { user: '', appPassword: '', fromName: '' },
		sendgrid: { apiKey: '', fromEmail: '', fromName: '' },
		nodemailer: { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: '' }
	});
	let testEmailAddress = $state('');
	let testEmailStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	// Helper to format duration values for display
	function formatDuration(seconds: number): string {
		if (seconds >= 86400) {
			return `${Math.floor(seconds / 86400)} days`;
		} else if (seconds >= 3600) {
			return `${Math.floor(seconds / 3600)} hours`;
		} else if (seconds >= 60) {
			return `${Math.floor(seconds / 60)} minutes`;
		}
		return `${seconds} seconds`;
	}

	// Helper to convert duration to appropriate unit
	function getDurationValue(seconds: number, preferredUnit: 'days' | 'hours' | 'minutes' | 'seconds' = 'hours'): number {
		if (preferredUnit === 'days') return Math.floor(seconds / 86400);
		if (preferredUnit === 'hours') return Math.floor(seconds / 3600);
		if (preferredUnit === 'minutes') return Math.floor(seconds / 60);
		return seconds;
	}

	// Helper to convert from unit to seconds
	function toSeconds(value: number, unit: string): number {
		if (unit === 'days') return value * 86400;
		if (unit === 'hours') return value * 3600;
		if (unit === 'minutes') return value * 60;
		return value;
	}

	// Initialize edited settings when entering edit mode
	function startEditing() {
		editedSettings = {};
		data.settings.forEach((setting: any) => {
			if (setting.type === 'duration') {
				// Convert to hours for editing
				editedSettings[setting.key] = getDurationValue(setting.value, 'hours');
			} else {
				editedSettings[setting.key] = setting.value;
			}
		});

		// Load email settings
		const providerSetting = data.settings.find((s: any) => s.key === 'email_service_provider');
		const configSetting = data.settings.find((s: any) => s.key === 'email_service_config');

		if (providerSetting) emailProvider = providerSetting.value;
		if (configSetting) emailConfig = configSetting.value;

		isEditing = true;
	}

	async function testEmailConnection() {
		testEmailStatus = null;

		try {
			const response = await fetch('/api/settings/test-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: emailProvider,
					config: emailConfig[emailProvider as keyof typeof emailConfig],
					testEmail: testEmailAddress
				})
			});

			const result = await response.json();

			if (response.ok) {
				testEmailStatus = { type: 'success', message: result.message || 'Test email sent successfully!' };
			} else {
				testEmailStatus = { type: 'error', message: result.error || 'Failed to send test email' };
			}
		} catch (error: any) {
			testEmailStatus = { type: 'error', message: error.message || 'Network error' };
		}
	}

	function cancelEditing() {
		isEditing = false;
		editedSettings = {};
	}

	// Group settings by category
	const settingsByCategory = $derived(() => {
		const grouped: Record<string, any[]> = {};
		data.settings.forEach((setting: any) => {
			if (!grouped[setting.category]) {
				grouped[setting.category] = [];
			}
			grouped[setting.category].push(setting);
		});
		return grouped;
	});

	// Get setting value (edited or original)
	function getSettingValue(setting: any) {
		if (isEditing && editedSettings[setting.key] !== undefined) {
			return editedSettings[setting.key];
		}
		if (setting.type === 'duration') {
			return getDurationValue(setting.value, 'hours');
		}
		return setting.value;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">System Settings</h2>
			<p class="text-sm text-gray-500">Configure global SSO settings</p>
		</div>
		{#if !isEditing}
			<button
				onclick={startEditing}
				class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			>
				Edit Settings
			</button>
		{/if}
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

	<form method="POST" action="?/update" use:enhance>
		{#if isEditing}
			<div class="flex justify-end gap-3 sticky top-0 mb-4">
				<button
					type="button"
					onclick={cancelEditing}
					class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					Save Changes
				</button>
			</div>
		{/if}
		{#each Object.entries(settingsByCategory()) as [category, settings]}
			{#if category === 'privacy'}
				<!-- Skip privacy category - it has a dedicated page at /settings/data-masking -->
			{:else if category === 'email'}
				<!-- Special Email Configuration Section -->
				<div class="bg-white shadow rounded-lg p-6 mb-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">📧 Email Service Configuration</h3>

					{#if isEditing}
						<!-- Provider Selection -->
						<div class="mb-6">
							<label class="block text-sm font-medium text-gray-900 mb-3">Email Service Provider</label>
							<div class="grid grid-cols-2 gap-4">
								<label class="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all {emailProvider === 'gmail' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}">
									<input type="radio" name="email_provider" value="gmail" bind:group={emailProvider} class="w-4 h-4 text-indigo-600" />
									<div>
										<div class="font-medium">Gmail SMTP</div>
										<div class="text-xs text-gray-500">Free 500 emails/day</div>
									</div>
								</label>

								<label class="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all {emailProvider === 'microsoft365' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}">
									<input type="radio" name="email_provider" value="microsoft365" bind:group={emailProvider} class="w-4 h-4 text-indigo-600" />
									<div>
										<div class="font-medium">Microsoft 365</div>
										<div class="text-xs text-gray-500">10,000 emails/day</div>
									</div>
								</label>

								<label class="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all {emailProvider === 'sendgrid' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}">
									<input type="radio" name="email_provider" value="sendgrid" bind:group={emailProvider} class="w-4 h-4 text-indigo-600" />
									<div>
										<div class="font-medium">SendGrid</div>
										<div class="text-xs text-gray-500">100 emails/day (free tier)</div>
									</div>
								</label>

								<label class="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all {emailProvider === 'nodemailer' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}">
									<input type="radio" name="email_provider" value="nodemailer" bind:group={emailProvider} class="w-4 h-4 text-indigo-600" />
									<div>
										<div class="font-medium">Custom SMTP</div>
										<div class="text-xs text-gray-500">Self-hosted/other SMTP</div>
									</div>
								</label>
							</div>
						</div>

						<!-- Dynamic Configuration Fields -->
						<div class="border border-gray-200 rounded-lg p-4 space-y-4">
							{#if emailProvider === 'gmail'}
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Gmail Address</label>
									<input type="email" bind:value={emailConfig.gmail.user} placeholder="your-email@gmail.com" class="w-full px-3 py-2 border rounded-md" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">App Password <span class="text-xs text-gray-500">(not your Gmail password!)</span></label>
									<input type="password" bind:value={emailConfig.gmail.appPassword} placeholder="16-character app password" class="w-full px-3 py-2 border rounded-md" />
									<p class="text-xs text-gray-500 mt-1">Generate at: <a href="https://myaccount.google.com/apppasswords" target="_blank" class="text-indigo-600 hover:underline">https://myaccount.google.com/apppasswords</a></p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">From Name</label>
									<input type="text" bind:value={emailConfig.gmail.fromName} placeholder="Aksara SSO" class="w-full px-3 py-2 border rounded-md" />
								</div>

							{:else if emailProvider === 'microsoft365'}
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Microsoft 365 Email</label>
									<input type="email" bind:value={emailConfig.microsoft365.user} placeholder="your-email@yourdomain.com" class="w-full px-3 py-2 border rounded-md" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Password / App Password</label>
									<input type="password" bind:value={emailConfig.microsoft365.appPassword} class="w-full px-3 py-2 border rounded-md" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">From Name</label>
									<input type="text" bind:value={emailConfig.microsoft365.fromName} placeholder="Aksara SSO" class="w-full px-3 py-2 border rounded-md" />
								</div>

							{:else if emailProvider === 'sendgrid'}
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">SendGrid API Key</label>
									<input type="password" bind:value={emailConfig.sendgrid.apiKey} placeholder="SG.xxxxxxxxxxxxx" class="w-full px-3 py-2 border rounded-md" />
									<p class="text-xs text-gray-500 mt-1">Get API key from SendGrid dashboard</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">From Email</label>
									<input type="email" bind:value={emailConfig.sendgrid.fromEmail} placeholder="noreply@yourdomain.com" class="w-full px-3 py-2 border rounded-md" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">From Name</label>
									<input type="text" bind:value={emailConfig.sendgrid.fromName} placeholder="Aksara SSO" class="w-full px-3 py-2 border rounded-md" />
								</div>

							{:else if emailProvider === 'nodemailer'}
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
										<input type="text" bind:value={emailConfig.nodemailer.host} placeholder="smtp.example.com" class="w-full px-3 py-2 border rounded-md" />
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
										<input type="number" bind:value={emailConfig.nodemailer.port} placeholder="587" class="w-full px-3 py-2 border rounded-md" />
									</div>
								</div>
								<div>
									<label class="flex items-center gap-2">
										<input type="checkbox" bind:checked={emailConfig.nodemailer.secure} class="w-4 h-4 text-indigo-600 border-gray-300 rounded" />
										<span class="text-sm text-gray-700">Use SSL/TLS (port 465)</span>
									</label>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
									<input type="text" bind:value={emailConfig.nodemailer.user} class="w-full px-3 py-2 border rounded-md" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
									<input type="password" bind:value={emailConfig.nodemailer.password} class="w-full px-3 py-2 border rounded-md" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">From Email</label>
									<input type="email" bind:value={emailConfig.nodemailer.fromEmail} placeholder="noreply@yourdomain.com" class="w-full px-3 py-2 border rounded-md" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">From Name</label>
									<input type="text" bind:value={emailConfig.nodemailer.fromName} placeholder="Aksara SSO" class="w-full px-3 py-2 border rounded-md" />
								</div>
							{/if}
						</div>

						<!-- Test Email -->
						<div class="mt-4 p-4 bg-gray-50 rounded-lg">
							<label class="block text-sm font-medium text-gray-700 mb-2">Test Email Configuration</label>
							<div class="flex gap-2">
								<input type="email" bind:value={testEmailAddress} placeholder="test@example.com" class="flex-1 px-3 py-2 border rounded-md" />
								<button type="button" onclick={testEmailConnection} class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
									Send Test
								</button>
							</div>
							{#if testEmailStatus}
								<div class="mt-2 p-3 rounded-md {testEmailStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
									{testEmailStatus.message}
								</div>
							{/if}
						</div>

						<!-- Hidden fields for form submission -->
						<input type="hidden" name="setting_email_service_provider" value={emailProvider} />
						<input type="hidden" name="setting_email_service_config" value={JSON.stringify(emailConfig)} />

					{:else}
						<!-- View Mode -->
						<div class="space-y-3">
							<div class="flex justify-between items-center">
								<span class="text-sm font-medium text-gray-700">Current Provider:</span>
								<span class="px-3 py-1 text-sm font-semibold bg-indigo-100 text-indigo-800 rounded-full capitalize">
									{data.settings.find((s: any) => s.key === 'email_service_provider')?.value || 'Not configured'}
								</span>
							</div>
							<div class="text-sm text-gray-600">
								Click "Edit Settings" to configure email service
							</div>
						</div>
					{/if}
				</div>

			{:else}
			<div class="bg-white shadow rounded-lg p-6 mb-6">
				<h3 class="text-lg font-medium text-gray-900 mb-4 capitalize">{category} Settings</h3>

				<div class="space-y-4">
					{#each settings as setting}
						<div class="border border-gray-200 rounded-lg p-4">
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<label class="block text-sm font-medium text-gray-900">
										{setting.label}
									</label>
									{#if setting.description}
										<p class="text-xs text-gray-500 mt-1">{setting.description}</p>
									{/if}
								</div>

								{#if isEditing}
									<div class="ml-4">
										{#if setting.type === 'boolean'}
											<input type="hidden" name="setting_{setting.key}_type" value="boolean" />
											<label class="flex items-center gap-2">
												<input
													type="checkbox"
													name="setting_{setting.key}"
													bind:checked={editedSettings[setting.key]}
													value="true"
													class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
												/>
												<span class="text-sm text-gray-700">Enabled</span>
											</label>
										{:else if setting.type === 'duration'}
											<div class="flex items-center gap-2">
												<input
													type="number"
													name="setting_{setting.key}"
													value={getSettingValue(setting)}
													min="1"
													onchange={(e) => {
														const hours = parseInt(e.currentTarget.value);
														editedSettings[setting.key] = toSeconds(hours, 'hours');
													}}
													class="w-24 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
												/>
												<span class="text-sm text-gray-700">hours</span>
											</div>
										{:else if setting.type === 'number'}
											<div class="flex items-center gap-2">
												<input
													type="number"
													name="setting_{setting.key}"
													value={getSettingValue(setting)}
													min="1"
													onchange={(e) => (editedSettings[setting.key] = parseInt(e.currentTarget.value))}
													class="w-24 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
												/>
												{#if setting.unit}
													<span class="text-sm text-gray-700">{setting.unit}</span>
												{/if}
											</div>
										{:else}
											<input
												type="text"
												name="setting_{setting.key}"
												value={getSettingValue(setting)}
												onchange={(e) => (editedSettings[setting.key] = e.currentTarget.value)}
												class="w-64 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
											/>
										{/if}
									</div>
								{:else}
									<div class="ml-4">
										{#if setting.type === 'boolean'}
											<span class="px-2 py-1 text-xs font-semibold rounded-full {setting.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
												{setting.value ? 'Enabled' : 'Disabled'}
											</span>
										{:else if setting.type === 'duration'}
											<span class="text-sm font-semibold text-indigo-600">
												{formatDuration(setting.value)}
											</span>
										{:else}
											<span class="text-sm font-semibold text-indigo-600">
												{setting.value}
												{#if setting.unit}
													<span class="text-gray-600">{setting.unit}</span>
												{/if}
											</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
			{/if}
		{/each}


	</form>

</div>
