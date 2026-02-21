<script lang="ts">
	import { enhance } from '$app/forms';
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
		organizationId?: string | null;
		isTesting?: boolean;
		isSyncing?: boolean;
	}

	let {
		config = null,
		syncHistory = [],
		isTesting = false,
		isSyncing = false,
		organizationId
	}: Props = $props();

	let tenantId = $state('');
	let clientId = $state('');
	let clientSecret = $state('');
	let autoSync = $state(false);
	let sampleUsers = $state<any[]>([]);
	let availableEntraFields = $state<string[]>([]);
	let availableIdentityFields = $state<string[]>([
		'email', 'username', 'firstName', 'lastName', 'fullName', 'phone',
		'employeeId', 'organizationId', 'orgUnitId', 'positionId', 'managerId',
		'employmentType', 'employmentStatus', 'workLocation', 'region',
		'dateOfBirth', 'gender', 'idNumber', 'taxId', 'personalEmail'
	]);
	let fieldMappings = $state<Array<{
		identityField: string;
		entraField: string;
		enabled: boolean;
		transformation?: string; // Optional transformation function
	}>>([
		{ identityField: 'email', entraField: 'userPrincipalName', enabled: true },
		{ identityField: 'firstName', entraField: 'givenName', enabled: true },
		{ identityField: 'lastName', entraField: 'surname', enabled: true },
		{ identityField: 'phone', entraField: 'mobilePhone', enabled: false },
	]);
	let filterQuery = $state('');
	let showFieldMapping = $state(false);
	let isExporting = $state(false);

	// Update form fields when config changes
	$effect(() => {
		if (config) {
			tenantId = config.tenantId || '';
			clientId = config.clientId || '';
			autoSync = config.autoSync || false;
			// Don't populate clientSecret from config (it's masked)
		}
	});

	function addFieldMapping() {
		fieldMappings = [...fieldMappings, { identityField: '', entraField: '', enabled: true, transformation: '' }];
	}

	function removeFieldMapping(index: number) {
		fieldMappings = fieldMappings.filter((_, i) => i !== index);
	}

	function extractAllFields(users: any[]): string[] {
		const fieldSet = new Set<string>();
		users.forEach(user => {
			Object.keys(user).forEach(key => fieldSet.add(key));
		});
		return Array.from(fieldSet).sort();
	}
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
				<form method="POST" action="?/testEntraConnection" use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						// Reload page if test was successful to update connection status
						if (result.type === 'success') {
							window.location.reload();
						}
					};
				}}>
					<input type="hidden" name="tenantId" value={tenantId} />
					<input type="hidden" name="clientId" value={clientId} />
					<input type="hidden" name="clientSecret" value={clientSecret} />
					<input type="hidden" name="organizationId" value={organizationId || ''} />
					<input type="hidden" name="useExistingSecret" value={!clientSecret && config ? 'true' : 'false'} />
					<button
						type="submit"
						disabled={isTesting || !tenantId || !clientId || (!clientSecret && !config)}
						class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isTesting ? '🔄 Testing...' : '🔌 Test Connection'}
					</button>
				</form>

				<form method="POST" action="?/saveEntraConfig" use:enhance>
					<input type="hidden" name="tenantId" value={tenantId} />
					<input type="hidden" name="clientId" value={clientId} />
					<input type="hidden" name="clientSecret" value={clientSecret} />
					<input type="hidden" name="organizationId" value={organizationId || ''} />
					<input type="hidden" name="autoSync" value={autoSync ? 'true' : 'false'} />
					<button
						type="submit"
						disabled={!tenantId || !clientId || (!clientSecret && !config)}
						class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						💾 Save Configuration
					</button>
				</form>
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

	<!-- Step 1: Fetch Preview Users -->
	{#if config?.isConnected}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Step 1: Preview EntraID Users</h3>

			<div class="space-y-4">
				<p class="text-sm text-gray-600">
					Fetch a preview of 3 users from Microsoft Entra ID to configure field mapping.
				</p>

				<!-- ODATA Filter -->
				<div>
					<label for="filterQuery" class="block text-sm font-medium text-gray-700 mb-1">
						ODATA Filter (Optional)
					</label>
					<input
						type="text"
						id="filterQuery"
						bind:value={filterQuery}
						placeholder="e.g., department eq 'IT' or startsWith(displayName,'John')"
						class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
					/>
					<div class="mt-1 text-xs text-gray-500 space-y-1">
						<p><strong>Filterable properties:</strong> <code class="bg-gray-100 px-1">accountEnabled</code>, <code class="bg-gray-100 px-1">displayName</code>, <code class="bg-gray-100 px-1">mail</code>, <code class="bg-gray-100 px-1">userPrincipalName</code>, <code class="bg-gray-100 px-1">userType</code></p>
						<p><strong>Examples:</strong></p>
						<ul class="list-disc list-inside ml-2">
							<li><code class="bg-gray-100 px-1">accountEnabled eq true</code> - Active users only</li>
							<li><code class="bg-gray-100 px-1">startsWith(displayName,'John')</code> - Names starting with "John"</li>
							<li><code class="bg-gray-100 px-1">endsWith(mail,'@ias.co.id')</code> - IAS email domain</li>
							<li><code class="bg-gray-100 px-1">userType eq 'Member'</code> - Exclude guests</li>
						</ul>
						<p class="text-amber-600"><strong>Note:</strong> Properties like <code>officeLocation</code>, <code>department</code>, <code>jobTitle</code> are NOT filterable but will be included in export!</p>
					</div>
				</div>

				<div class="flex space-x-3">
					<form method="POST" action="?/fetchEntraUsers" use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success' && result.data?.sampleUsers) {
								sampleUsers = result.data.sampleUsers;
								availableEntraFields = extractAllFields(result.data.sampleUsers);
								showFieldMapping = true;
							}
							await update();
						};
					}}>
						<input type="hidden" name="organizationId" value={organizationId || ''} />
						<input type="hidden" name="filterQuery" value={filterQuery} />
						<button
							type="submit"
							class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<span class="mr-2">👥</span>
							Fetch Sample Users
						</button>
					</form>

					<form method="POST" action="?/fetchEntraUsers" use:enhance={() => {
						isExporting = true;
						return async ({ result, update }) => {
							if (result.type === 'success' && result.data?.csvContent) {
								const blob = new Blob([result.data.csvContent], { type: 'text/csv' });
								const url = URL.createObjectURL(blob);
								const a = document.createElement('a');
								a.href = url;
								a.download = `entraid-users-export-${new Date().toISOString().split('T')[0]}.csv`;
								a.click();
								URL.revokeObjectURL(url);
								alert(`✅ Exported ${result.data.userCount} users to CSV`);
							}
							isExporting = false;
							await update();
						};
					}}>
						<input type="hidden" name="organizationId" value={organizationId || ''} />
						<input type="hidden" name="filterQuery" value={filterQuery} />
						<input type="hidden" name="exportToCsv" value="true" />
						<button
							type="submit"
							disabled={isExporting}
							class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span class="mr-2">{isExporting ? '⏳' : '📥'}</span>
							{isExporting ? 'Exporting...' : 'Export to CSV'}
						</button>
					</form>
				</div>

				{#if sampleUsers.length > 0}
					<div class="mt-4">
						<h4 class="text-sm font-medium text-gray-700 mb-2">Sample Users (3) - Found {availableEntraFields.length} fields:</h4>
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200 border border-gray-200">
								<thead class="bg-gray-50">
									<tr>
										{#each availableEntraFields as field}
											<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{field}</th>
										{/each}
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each sampleUsers as user}
										<tr>
											{#each availableEntraFields as field}
												<td class="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
													{user[field] !== null && user[field] !== undefined ? String(user[field]) : '-'}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Step 2: Configure Field Mapping -->
		{#if showFieldMapping}
			<div class="bg-white shadow rounded-lg p-6">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Step 2: Configure Field Mapping</h3>

				<div class="space-y-4">
					<p class="text-sm text-gray-600">
						Map EntraID fields to Identity fields. Add, remove, or enable/disable mappings as needed.
					</p>

					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200 border border-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Identity Field</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">EntraID Field</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transformation</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Enabled</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each fieldMappings as mapping, index}
									<tr>
										<td class="px-4 py-2 text-sm">
											<select
												bind:value={mapping.identityField}
												class="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
											>
												<option value="">Select field...</option>
												{#each availableIdentityFields as field}
													<option value={field}>{field}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 text-sm">
											<select
												bind:value={mapping.entraField}
												class="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
											>
												<option value="">Select field...</option>
												{#each availableEntraFields as field}
													<option value={field}>{field}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 text-sm">
											<select
												bind:value={mapping.transformation}
												class="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
											>
												<option value="">None (Direct Copy)</option>
												<option value="orgCodeToId">Org Code → Org ID</option>
												<option value="orgUnitNameToId">Org Unit Name → Org Unit ID</option>
												<option value="positionNameToId">Position Name → Position ID</option>
												<option value="lowercase">Lowercase</option>
												<option value="uppercase">Uppercase</option>
												<option value="trim">Trim Whitespace</option>
												<option value="toCustomProperty">→ Custom Property</option>
											</select>
										</td>
										<td class="px-4 py-2 text-sm text-center">
											<input
												type="checkbox"
												bind:checked={mapping.enabled}
												class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
											/>
										</td>
										<td class="px-4 py-2 text-sm text-center">
											<button
												type="button"
												onclick={() => removeFieldMapping(index)}
												class="text-red-600 hover:text-red-800"
												title="Remove mapping"
											>
												🗑️
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<button
						type="button"
						onclick={addFieldMapping}
						class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						<span class="mr-2">➕</span>
						Add Field Mapping
					</button>

					<form method="POST" action="?/updateFieldMapping" use:enhance>
						<input type="hidden" name="organizationId" value={organizationId || ''} />
						<input type="hidden" name="fieldMapping" value={JSON.stringify(
							fieldMappings.reduce((acc, m) => {
								if (m.identityField && m.entraField) {
									acc[m.identityField] = {
										entraField: m.entraField,
										enabled: m.enabled,
										direction: 'from_entra',
										transformation: m.transformation || ''
									};
								}
								return acc;
							}, {} as Record<string, any>)
						)} />
						<button
							type="submit"
							class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						>
							<span class="mr-2">💾</span>
							Save Field Mapping
						</button>
					</form>
				</div>
			</div>

			<!-- Step 3: Sync Users -->
			<div class="bg-white shadow rounded-lg p-6">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Step 3: Sync All Users</h3>

				<div class="space-y-4">
					<p class="text-sm text-gray-600">
						Sync all users from Microsoft Entra ID to Aksara SSO. New users will be created with <strong>isActive: true</strong>, existing users will be updated while preserving their status and passwords.
					</p>

					<form method="POST" action="?/syncEntraUsers" use:enhance>
						<input type="hidden" name="organizationId" value={organizationId || ''} />
						<button
							type="submit"
							disabled={isSyncing}
							class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span class="mr-2">🔄</span>
							{isSyncing ? 'Syncing...' : 'Sync All Users Now'}
						</button>
					</form>
				</div>
			</div>
		{/if}

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
