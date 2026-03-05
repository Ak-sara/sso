<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state
	let tenantId = $state(data.config?.tenantId || '');
	let clientId = $state(data.config?.clientId || '');
	let clientSecret = $state('');
	let syncUsers = $state(data.config?.syncUsers ?? true);
	let syncGroups = $state(data.config?.syncGroups ?? false);
	let autoSync = $state(data.config?.autoSync ?? false);
	let syncDirection = $state<'to_entra' | 'from_entra' | 'bidirectional'>('from_entra');

	// Field mapping state
	let fieldMapping = $state(data.config?.fieldMapping || {
		email: { entraField: 'userPrincipalName', enabled: true, direction: 'to_entra' },
		firstName: { entraField: 'givenName', enabled: true, direction: 'to_entra' },
		lastName: { entraField: 'surname', enabled: true, direction: 'to_entra' },
		phone: { entraField: 'mobilePhone', enabled: false, direction: 'to_entra' },
	});

	// UI state
	let testing = $state(false);
	let saving = $state(false);
	let syncing = $state(false);
	let testResult = $state<{ success?: boolean; message?: string; error?: string } | null>(null);

	const isConnected = $derived(data.config?.isConnected ?? false);
	const hasExistingConfig = $derived(!!data.config);
	const connectionStatus = $derived(
		isConnected ? 'Connected' : data.config ? 'Connection Failed' : 'Not Connected'
	);
	const statusColor = $derived(
		isConnected ? 'bg-green-100 text-green-800' : data.config ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
	);

	// Allow test if we have credentials OR if config exists (will use saved secret)
	const canTest = $derived((tenantId && clientId && clientSecret) || (hasExistingConfig && tenantId && clientId));
</script>

<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang Microsoft Entra ID Sync</h3>
				<p class="mt-1 text-sm text-blue-700">
					Sinkronisasi dengan Microsoft Entra ID (formerly Azure AD) memungkinkan data pengguna dan grup
					dari Aksara SSO disinkronkan ke cloud Microsoft. Anda dapat memilih field mana yang akan disinkronkan
					dan mengatur jadwal sinkronisasi otomatis.
				</p>
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if testResult?.success}
		<div class="bg-green-50 border border-green-200 rounded-lg p-4">
			<p class="text-sm text-green-800">✅ {testResult.message || 'Connection test successful!'}</p>
		</div>
	{/if}

	{#if testResult?.error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<span class="text-xl">❌</span>
				</div>
				<div class="ml-3 flex-1">
					<h3 class="text-sm font-medium text-red-800">Connection Test Failed</h3>
					<div class="mt-2 text-sm text-red-700">
						<p class="font-mono text-xs bg-red-100 p-2 rounded break-words">{testResult.error}</p>
					</div>

					{#if testResult.error.includes('Authorization_RequestDenied') || testResult.error.includes('Insufficient privileges')}
						<div class="mt-3 text-sm text-red-800">
							<p class="font-semibold">🔧 How to fix:</p>
							<ol class="list-decimal list-inside mt-2 space-y-1">
								<li>Go to Azure Portal → App Registrations → Your App</li>
								<li>Click "API permissions" in the left menu</li>
								<li>Click "Grant admin consent for [Your Tenant]"</li>
								<li>Required permissions:
									<ul class="list-disc list-inside ml-6 mt-1">
										<li><code class="bg-red-100 px-1">User.Read.All</code> or <code class="bg-red-100 px-1">User.ReadWrite.All</code></li>
										<li><code class="bg-red-100 px-1">Directory.Read.All</code></li>
									</ul>
								</li>
								<li>Wait 5-10 minutes for changes to propagate</li>
								<li>Click "Test Connection" again</li>
							</ol>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if form?.success}
		<div class="bg-green-50 border border-green-200 rounded-lg p-4">
			<p class="text-sm text-green-800">✅ {form.message}</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-sm text-red-800">❌ {form.error}</p>
		</div>
	{/if}

	<!-- Connection Configuration -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-lg font-medium text-gray-900">Connection Configuration</h3>
			<div style="display:flex;gap:1em;margin-top:1em">
			<span class="px-3 py-1 text-sm font-semibold rounded-full {statusColor}">
				{connectionStatus}
			</span>
			<form
				method="POST"
				action="?/importFromEntra"
				use:enhance={() => {
					syncing = true;
					return async ({ update }) => {
						await update();
						syncing = false;
					};
				}}
			>
				<input type="hidden" name="organizationId" value={data.organizationId} />
				<button
					type="submit"
					disabled={syncing || !isConnected}
					class="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{syncing ? 'Importing...' : '← Import from Entra ID'}
				</button>
			</form>
			<form
				method="POST"
				action="?/exportToEntra"
				use:enhance={() => {
					syncing = true;
					return async ({ update }) => {
						await update();
						syncing = false;
					};
				}}
			>
				<input type="hidden" name="organizationId" value={data.organizationId} />
				<button
					type="submit"
					disabled={syncing || !isConnected}
					class="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{syncing ? 'Exporting...' : '→ Export to Entra ID'}
				</button>
			</form>
			<form
				method="POST"
				action="?/syncBidirectional"
				use:enhance={() => {
					syncing = true;
					return async ({ update }) => {
						await update();
						syncing = false;
					};
				}}
			>
				<input type="hidden" name="organizationId" value={data.organizationId} />
				<button
					type="submit"
					disabled={syncing || !isConnected}
					class="w-full px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{syncing ? 'Syncing...' : '↔ Sync Both Ways'}
				</button>
			</form>
			</div>
		</div>

		<form
			method="POST"
			action="?/saveConfig"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update();
					saving = false;
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="organizationId" value={data.organizationId} />

			<div>
				<label for="tenantId" class="block text-sm font-medium text-gray-700 mb-2">
					Tenant ID <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="tenantId"
					name="tenantId"
					bind:value={tenantId}
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
				/>
				<p class="mt-1 text-xs text-gray-500">Found in Azure Portal → Microsoft Entra ID → Overview</p>
			</div>

			<div>
				<label for="clientId" class="block text-sm font-medium text-gray-700 mb-2">
					Client ID (Application ID) <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="clientId"
					name="clientId"
					bind:value={clientId}
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
				/>
				<p class="mt-1 text-xs text-gray-500">Found in App Registration → Overview</p>
			</div>

			<div>
				<label for="clientSecret" class="block text-sm font-medium text-gray-700 mb-2">
					Client Secret {#if !data.config}<span class="text-red-500">*</span>{/if}
				</label>
				<input
					type="password"
					id="clientSecret"
					name="clientSecret"
					bind:value={clientSecret}
					placeholder={data.config ? 'Leave blank to keep existing secret' : 'Enter client secret'}
					required={!data.config}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
				/>
				<p class="mt-1 text-xs text-gray-500">
					{#if data.config}
						✅ Using saved secret. Leave blank to keep, or enter new secret to update.
					{:else}
						Found in App Registration → Certificates & secrets
					{/if}
				</p>
			</div>

			<!-- Sync Options -->
			<div class="border-t pt-4 mt-6">
				<h4 class="text-sm font-medium text-gray-900 mb-3">Automatic Sync Settings</h4>

				<div class="space-y-3">
					<label class="flex items-center">
						<input type="checkbox" name="autoSync" value="true" bind:checked={autoSync} class="rounded" />
						<span class="ml-2 text-sm text-gray-700">Enable automatic sync (runs hourly in background)</span>
					</label>

					{#if autoSync}
						<div class="ml-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
							⚠️ When auto-sync is enabled, the system will automatically run bidirectional sync every hour.
							Manual sync buttons below allow you to sync on-demand in specific directions.
						</div>
					{/if}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex space-x-3 pt-4">
				<button
					type="button"
					disabled={testing || !canTest}
					onclick={async (e) => {
						e.preventDefault();
						testing = true;
						testResult = null;

						const formData = new FormData();
						formData.append('tenantId', tenantId);
						formData.append('clientId', clientId);
						// Only send secret if provided, otherwise server will use saved one
						if (clientSecret) {
							formData.append('clientSecret', clientSecret);
						} else if (hasExistingConfig) {
							formData.append('useExistingSecret', 'true');
						}

						try {
							const response = await fetch('?/testConnection', {
								method: 'POST',
								body: formData,
							});

							const result = await response.json();
							console.log('Test result:', result); // Debug log

							if (result.type === 'success') {
								testResult = { success: true, message: result.data?.message || 'Connection successful!' };
							} else if (result.type === 'failure') {
								// SvelteKit wraps errors in a specific format
								// result.data is an array where index 0 is the error object and index 1 is the error message
								let errorMessage = 'Connection test failed';

								if (result.data) {
									if (Array.isArray(result.data)) {
										// Format: [{ error: 1 }, "actual error message"]
										if (result.data.length > 1 && typeof result.data[1] === 'string') {
											errorMessage = result.data[1];
										} else if (result.data[0]?.error) {
											errorMessage = result.data[0].error;
										}
									} else if (typeof result.data === 'object' && result.data.error) {
										errorMessage = result.data.error;
									} else if (typeof result.data === 'string') {
										errorMessage = result.data;
									}
								}

								testResult = { error: errorMessage };
							}
						} catch (error: any) {
							testResult = { error: error.message || 'Failed to test connection' };
						} finally {
							testing = false;
						}
					}}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{testing ? 'Testing...' : 'Test Connection'}
				</button>

				<button
					type="submit"
					disabled={saving || !tenantId || !clientId}
					class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{saving ? 'Saving...' : 'Save Configuration'}
				</button>
			</div>
		</form>
		
	</div>

	<!-- Field Mapping -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-medium text-gray-900">Field Mapping</h3>
			<button
				onclick={() => {
					// TODO: Add modal to add new field mapping
					alert('Add new field mapping feature coming soon!');
				}}
				class="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			>
				+ Add Field
			</button>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksara SSO Field</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entra ID Field</th>
						<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Direction</th>
						<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Enabled</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each Object.entries(fieldMapping) as [aksaraField, config]}
						<tr>
							<td class="px-6 py-4 text-sm font-medium text-gray-900">{aksaraField}</td>
							<td class="px-6 py-4 text-sm text-gray-500">{config.entraField}</td>
							<td class="px-6 py-4 text-center">
								<select
									bind:value={config.direction}
									class="text-xs border-gray-300 rounded"
									onchange={() => {
										// TODO: Auto-save on change
									}}
								>
									<option value="to_entra">→ To Entra</option>
									<option value="from_entra">← From Entra</option>
									<option value="bidirectional">↔ Bidirectional</option>
								</select>
							</td>
							<td class="px-6 py-4 text-center">
								<input
									type="checkbox"
									bind:checked={config.enabled}
									class="rounded"
									onchange={() => {
										// TODO: Auto-save on change
									}}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-4 flex justify-end">
			<form
				method="POST"
				action="?/updateFieldMapping"
				use:enhance
			>
				<input type="hidden" name="organizationId" value={data.organizationId} />
				<input type="hidden" name="fieldMapping" value={JSON.stringify(fieldMapping)} />
				<button
					type="submit"
					class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
				>
					Save Field Mapping
				</button>
			</form>
		</div>
	</div>

	<!-- Sync History -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex justify-between items-center mb-4">
			<h3 class="text-lg font-medium text-gray-900">Sync History</h3>
		</div>

		{#if data.syncHistory && data.syncHistory.length > 0}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sync ID</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Records</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each data.syncHistory as log}
							<tr>
								<td class="px-6 py-4 text-sm text-gray-900 font-mono">{log.syncId}</td>
								<td class="px-6 py-4 text-sm text-gray-500 capitalize">{log.type}</td>
								<td class="px-6 py-4 text-sm">
									<span
										class="px-2 py-1 text-xs font-semibold rounded-full
										{log.status === 'completed' ? 'bg-green-100 text-green-800' :
										log.status === 'failed' ? 'bg-red-100 text-red-800' :
										log.status === 'running' ? 'bg-blue-100 text-blue-800' :
										'bg-gray-100 text-gray-800'}"
									>
										{log.status}
									</span>
								</td>
								<td class="px-6 py-4 text-sm text-gray-500">
									{new Date(log.startedAt).toLocaleString()}
								</td>
								<td class="px-6 py-4 text-sm text-gray-500 text-right">
									{log.totalRecords} total, {log.successCount} success, {log.failureCount} failed
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="text-center py-12 text-gray-500">
				<p class="text-lg">No sync history yet</p>
				<p class="text-sm mt-2">Configure and test your connection first</p>
			</div>
		{/if}
	</div>
</div>
