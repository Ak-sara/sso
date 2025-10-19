<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let showCreateModal = false;
	let showSecretModal = false;
	let newSecret = '';
	let newClientId = '';

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		alert('Copied to clipboard!');
	}
</script>

<div class="container mx-auto p-6">
	<div class="flex justify-between items-center mb-6">
		<div>
			<h1 class="text-3xl font-bold">SCIM Client Management</h1>
			<p class="text-gray-600 mt-1">Manage OAuth 2.0 credentials for SCIM API access</p>
		</div>
		<button
			onclick={() => (showCreateModal = true)}
			class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
		>
			+ New SCIM Client
		</button>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 rounded-lg shadow">
			<p class="text-gray-600 text-sm">Total Clients</p>
			<p class="text-2xl font-bold">{data.clients.length}</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<p class="text-gray-600 text-sm">Active Clients</p>
			<p class="text-2xl font-bold text-green-600">
				{data.clients.filter((c) => c.isActive).length}
			</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<p class="text-gray-600 text-sm">Total Requests (24h)</p>
			<p class="text-2xl font-bold">
				{data.clients.reduce((sum, c) => sum + (c.stats?.requestsLast24h || 0), 0)}
			</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<p class="text-gray-600 text-sm">Avg Error Rate</p>
			<p class="text-2xl font-bold text-red-600">
				{(
					data.clients.reduce((sum, c) => sum + (c.stats?.errorRate || 0), 0) /
						data.clients.length || 0
				).toFixed(1)}%
			</p>
		</div>
	</div>

	<!-- Clients Table -->
	<div class="bg-white rounded-lg shadow overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client ID</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scopes</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
						Rate Limit
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each data.clients as client}
					<tr>
						<td class="px-6 py-4">
							<div>
								<p class="font-medium text-gray-900">{client.clientName}</p>
								<p class="text-sm text-gray-500">{client.description || ''}</p>
								{#if client.contactEmail}
									<p class="text-xs text-gray-400">{client.contactEmail}</p>
								{/if}
							</div>
						</td>
						<td class="px-6 py-4">
							<code class="text-xs bg-gray-100 px-2 py-1 rounded">{client.clientId}</code>
							<button
								onclick={() => copyToClipboard(client.clientId)}
								class="ml-2 text-blue-600 hover:text-blue-800 text-xs"
							>
								Copy
							</button>
						</td>
						<td class="px-6 py-4">
							<div class="flex flex-wrap gap-1">
								{#each client.scopes as scope}
									<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{scope}</span>
								{/each}
							</div>
						</td>
						<td class="px-6 py-4 text-sm text-gray-900">
							{client.rateLimit} req/min
						</td>
						<td class="px-6 py-4">
							{#if client.stats}
								<div class="text-sm">
									<p class="text-gray-900">{client.stats.totalRequests} total</p>
									<p class="text-gray-600">{client.stats.requestsLast24h} / 24h</p>
									<p class="text-gray-600">{client.stats.avgDuration}ms avg</p>
									<p class="text-red-600">{client.stats.errorRate}% errors</p>
								</div>
							{:else}
								<span class="text-gray-400">No data</span>
							{/if}
						</td>
						<td class="px-6 py-4">
							{#if client.isActive}
								<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
									Active
								</span>
							{:else}
								<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
									Inactive
								</span>
							{/if}
							{#if client.lastUsedAt}
								<p class="text-xs text-gray-500 mt-1">
									Last used: {formatDate(client.lastUsedAt)}
								</p>
							{/if}
						</td>
						<td class="px-6 py-4">
							<div class="flex gap-2">
								<form method="POST" action="?/rotateSecret" use:enhance>
									<input type="hidden" name="clientId" value={client.clientId} />
									<button
										type="submit"
										class="text-blue-600 hover:text-blue-800 text-sm"
										onclick={(e) => {
											if (!confirm('Rotate secret? All existing tokens will be revoked.')) {
												e.preventDefault();
											}
										}}
									>
										Rotate Secret
									</button>
								</form>
								{#if client.isActive}
									<form method="POST" action="?/deactivate" use:enhance>
										<input type="hidden" name="clientId" value={client.clientId} />
										<button
											type="submit"
											class="text-red-600 hover:text-red-800 text-sm"
											onclick={(e) => {
												if (!confirm('Deactivate this client?')) {
													e.preventDefault();
												}
											}}
										>
											Deactivate
										</button>
									</form>
								{:else}
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="clientId" value={client.clientId} />
										<button
											type="submit"
											class="text-red-600 hover:text-red-800 text-sm font-semibold"
											onclick={(e) => {
												if (!confirm('⚠️ DELETE this client permanently? This action cannot be undone!')) {
													e.preventDefault();
												}
											}}
										>
											🗑️ Delete
										</button>
									</form>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Create Modal -->
	{#if showCreateModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<h2 class="text-2xl font-bold mb-4">Create SCIM Client</h2>

				<form method="POST" action="?/create" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Client Name <span class="text-red-600">*</span>
						</label>
						<input
							type="text"
							name="clientName"
							required
							placeholder="OFM Production"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
						<textarea
							name="description"
							rows="2"
							placeholder="SCIM client for OFM application"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg"
						></textarea>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
						<input
							type="email"
							name="contactEmail"
							placeholder="devops@ias.co.id"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Scopes <span class="text-red-600">*</span>
						</label>
						<div class="space-y-2">
							<label class="flex items-center">
								<input type="checkbox" name="scopes" value="read:users" checked class="mr-2" />
								<span class="text-sm">read:users - Read user data</span>
							</label>
							<label class="flex items-center">
								<input type="checkbox" name="scopes" value="write:users" class="mr-2" />
								<span class="text-sm">write:users - Create/update users</span>
							</label>
							<label class="flex items-center">
								<input type="checkbox" name="scopes" value="delete:users" class="mr-2" />
								<span class="text-sm">delete:users - Delete users</span>
							</label>
							<label class="flex items-center">
								<input type="checkbox" name="scopes" value="read:groups" checked class="mr-2" />
								<span class="text-sm">read:groups - Read group/org unit data</span>
							</label>
							<label class="flex items-center">
								<input type="checkbox" name="scopes" value="write:groups" class="mr-2" />
								<span class="text-sm">write:groups - Create/update groups</span>
							</label>
							<label class="flex items-center">
								<input type="checkbox" name="scopes" value="delete:groups" class="mr-2" />
								<span class="text-sm">delete:groups - Delete groups</span>
							</label>
							<label class="flex items-center">
								<input type="checkbox" name="scopes" value="bulk:operations" class="mr-2" />
								<span class="text-sm">bulk:operations - Bulk operations</span>
							</label>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Rate Limit (requests/minute)
						</label>
						<input
							type="number"
							name="rateLimit"
							value="100"
							min="1"
							max="1000"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							IP Whitelist (one per line)
						</label>
						<textarea
							name="ipWhitelist"
							rows="3"
							placeholder="192.168.1.0/24&#10;10.0.0.5&#10;172.16.0.0/16"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
						></textarea>
						<p class="text-xs text-gray-500 mt-1">Leave empty to allow all IPs</p>
					</div>

					<div class="flex justify-end gap-3 pt-4">
						<button
							type="button"
							onclick={() => (showCreateModal = false)}
							class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							Create Client
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Success Modal (shows client secret) -->
	{#if form?.success && form?.plainSecret}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 max-w-xl w-full">
				<h2 class="text-2xl font-bold mb-4 text-green-600">✓ Client Created Successfully!</h2>

				<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
					<p class="text-sm text-yellow-800">
						<strong>⚠️ Important:</strong> Save these credentials now. The client secret will not be shown
						again!
					</p>
				</div>

				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
						<div class="flex gap-2">
							<code class="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm">
								{form.client.clientId}
							</code>
							<button
								onclick={() => copyToClipboard(form.client.clientId)}
								class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Copy
							</button>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
						<div class="flex gap-2">
							<code class="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm break-all">
								{form.plainSecret}
							</code>
							<button
								onclick={() => copyToClipboard(form.plainSecret)}
								class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Copy
							</button>
						</div>
					</div>

					<div class="bg-gray-50 p-4 rounded">
						<p class="text-sm font-medium text-gray-700 mb-2">How to get access token:</p>
						<pre
							class="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto"><code>curl -X POST \
  http://localhost:5173/scim/v2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id={form.client.clientId}" \
  -d "client_secret={form.plainSecret}"</code></pre>
					</div>
				</div>

				<div class="flex justify-end gap-3 pt-4">
					<button
						onclick={() => window.location.reload()}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
