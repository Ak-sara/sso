<script lang="ts">
	import SyncStatsCard from './SyncStatsCard.svelte';

	interface Props {
		config?: {
			tenantId: string;
			clientId: string;
			isConnected: boolean;
			lastSyncAt?: Date;
			autoSync: boolean;
		} | null;
		syncHistory?: Array<{
			timestamp: Date;
			status: 'success' | 'failed';
			created: number;
			updated: number;
			errors: number;
		}>;
		onTestConnection?: () => Promise<void>;
		onSync?: () => Promise<void>;
		onSaveConfig?: (config: any) => Promise<void>;
		isTesting?: boolean;
		isSyncing?: boolean;
	}

	let {
		config = null,
		syncHistory = [],
		onTestConnection,
		onSync,
		onSaveConfig,
		isTesting = false,
		isSyncing = false
	}: Props = $props();

	let tenantId = $state(config?.tenantId || '');
	let clientId = $state(config?.clientId || '');
	let clientSecret = $state('');
	let autoSync = $state(config?.autoSync || false);
</script>

<div class="space-y-6">
	<!-- Connection Configuration -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Microsoft Entra ID Configuration</h3>

		<div class="space-y-4">
			<!-- Tenant ID -->
			<div>
				<label for="tenantId" class="block text-sm font-medium text-gray-700 mb-1">
					Tenant ID
				</label>
				<input
					type="text"
					id="tenantId"
					bind:value={tenantId}
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
				/>
				<p class="mt-1 text-sm text-gray-500">
					Your Azure AD Tenant ID (found in Azure Portal)
				</p>
			</div>

			<!-- Client ID -->
			<div>
				<label for="clientId" class="block text-sm font-medium text-gray-700 mb-1">
					Client ID (Application ID)
				</label>
				<input
					type="text"
					id="clientId"
					bind:value={clientId}
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
				/>
			</div>

			<!-- Client Secret -->
			<div>
				<label for="clientSecret" class="block text-sm font-medium text-gray-700 mb-1">
					Client Secret
				</label>
				<input
					type="password"
					id="clientSecret"
					bind:value={clientSecret}
					placeholder="Enter client secret"
					class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
				/>
				<p class="mt-1 text-sm text-gray-500">
					Client secret from your Azure AD app registration
				</p>
			</div>

			<!-- Auto Sync -->
			<div class="flex items-center">
				<input
					type="checkbox"
					id="autoSync"
					bind:checked={autoSync}
					class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
				/>
				<label for="autoSync" class="ml-2 block text-sm text-gray-900">
					Enable automatic sync (every hour)
				</label>
			</div>

			<!-- Action Buttons -->
			<div class="flex space-x-4">
				<button
					type="button"
					onclick={onTestConnection}
					disabled={isTesting || !tenantId || !clientId || !clientSecret}
					class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isTesting ? '🔄 Testing...' : '🔌 Test Connection'}
				</button>

				<button
					type="button"
					onclick={() => onSaveConfig?.({ tenantId, clientId, clientSecret, autoSync })}
					disabled={!tenantId || !clientId}
					class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					💾 Save Configuration
				</button>
			</div>
		</div>

		<!-- Connection Status -->
		{#if config?.isConnected !== undefined}
			<div class="mt-4 p-4 rounded-md {config.isConnected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
				<div class="flex items-center">
					<span class="text-2xl mr-2">{config.isConnected ? '✅' : '❌'}</span>
					<div>
						<p class="text-sm font-medium {config.isConnected ? 'text-green-800' : 'text-red-800'}">
							{config.isConnected ? 'Connected to Microsoft Entra ID' : 'Not connected'}
						</p>
						{#if config.lastSyncAt}
							<p class="text-sm {config.isConnected ? 'text-green-600' : 'text-red-600'}">
								Last sync: {new Date(config.lastSyncAt).toLocaleString('id-ID')}
							</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Sync Section -->
	{#if config?.isConnected}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Sync Employee Data</h3>

			<div class="space-y-4">
				<p class="text-sm text-gray-600">
					Sync employee data from Microsoft Entra ID to Aksara SSO. New employees will be created with <strong>isActive: true</strong>, existing employees will be updated while preserving their status and passwords.
				</p>

				<button
					type="button"
					onclick={onSync}
					disabled={isSyncing}
					class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<span class="mr-2">🔄</span>
					{isSyncing ? 'Syncing...' : 'Sync Now'}
				</button>
			</div>
		</div>

		<!-- Sync History -->
		{#if syncHistory && syncHistory.length > 0}
			<div class="bg-white shadow rounded-lg p-6">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Sync History</h3>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Errors</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each syncHistory as sync}
								<tr>
									<td class="px-4 py-2 text-sm text-gray-900">
										{new Date(sync.timestamp).toLocaleString('id-ID')}
									</td>
									<td class="px-4 py-2">
										<span class="px-2 py-1 text-xs font-semibold rounded-full {sync.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
											{sync.status === 'success' ? '✅ Success' : '❌ Failed'}
										</span>
									</td>
									<td class="px-4 py-2 text-sm text-gray-900">{sync.created}</td>
									<td class="px-4 py-2 text-sm text-gray-900">{sync.updated}</td>
									<td class="px-4 py-2 text-sm text-gray-900">{sync.errors}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Setup Instructions -->
	<div class="bg-blue-50 border border-blue-200 rounded-md p-4">
		<h4 class="text-sm font-medium text-blue-800 mb-2">📝 Setup Instructions</h4>
		<ol class="list-decimal list-inside text-sm text-blue-700 space-y-1">
			<li>Go to <a href="https://portal.azure.com" target="_blank" class="underline">Azure Portal</a></li>
			<li>Navigate to <strong>Azure Active Directory</strong> → <strong>App registrations</strong></li>
			<li>Create a new app registration or select existing</li>
			<li>Note the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong></li>
			<li>Go to <strong>Certificates & secrets</strong> → Create a new <strong>client secret</strong></li>
			<li>Grant API permissions: <code>User.Read.All</code>, <code>Directory.Read.All</code></li>
			<li>Enter credentials above and test connection</li>
		</ol>
	</div>
</div>
