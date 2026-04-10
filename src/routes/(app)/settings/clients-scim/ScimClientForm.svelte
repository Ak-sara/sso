<script lang="ts">
	interface Props {
		client: any;
		onSave: () => void;
	}

	let { client = $bindable(), onSave }: Props = $props();

	function addIpWhitelist() {
		if (!client.ipWhitelist) client.ipWhitelist = [];
		client.ipWhitelist = [...client.ipWhitelist, ''];
	}

	function removeIpWhitelist(index: number) {
		client.ipWhitelist = client.ipWhitelist.filter((_: any, i: number) => i !== index);
	}
</script>

<!-- Content -->
<div class="p-6 space-y-4">
	<!-- Client Name -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
		<input
			type="text"
			bind:value={client.clientName}
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		/>
	</div>

	<!-- Description -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
		<textarea
			bind:value={client.description}
			rows="2"
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		></textarea>
	</div>

	<!-- Contact Email -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
		<input
			type="email"
			bind:value={client.contactEmail}
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		/>
	</div>

	<!-- Scopes -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
		<div class="space-y-2">
			{#each ['read:users', 'write:users', 'delete:users', 'read:groups', 'write:groups', 'delete:groups', 'bulk:operations'] as scopeOption}
				<label class="flex items-center">
					<input
						type="checkbox"
						checked={client.scopes?.includes(scopeOption)}
						onchange={(e) => {
							if (e.currentTarget.checked) {
								if (!client.scopes) client.scopes = [];
								client.scopes = [...client.scopes, scopeOption];
							} else {
								client.scopes = client.scopes.filter((s: string) => s !== scopeOption);
							}
						}}
						class="mr-2"
					/>
					<span class="text-sm">{scopeOption}</span>
				</label>
			{/each}
		</div>
	</div>

	<!-- Rate Limit -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Rate Limit (requests/minute)</label>
		<input
			type="number"
			bind:value={client.rateLimit}
			min="1"
			max="1000"
			class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
		/>
	</div>

	<!-- IP Whitelist -->
	<div>
		<div class="flex justify-between items-center mb-2">
			<label class="block text-sm font-medium text-gray-700">IP Whitelist</label>
			<button
				type="button"
				onclick={addIpWhitelist}
				class="text-sm text-indigo-600 hover:text-indigo-800"
			>
				+ Add IP
			</button>
		</div>
		<div class="space-y-2">
			{#each client.ipWhitelist || [] as ip, index}
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={client.ipWhitelist[index]}
						placeholder="192.168.1.0/24"
						class="flex-1 px-3 py-2 border rounded-md font-mono text-sm focus:ring-2 focus:ring-indigo-500"
					/>
					<button
						type="button"
						onclick={() => removeIpWhitelist(index)}
						class="px-3 py-2 text-red-600 hover:text-red-800"
					>
						Remove
					</button>
				</div>
			{/each}
			{#if !client.ipWhitelist || client.ipWhitelist.length === 0}
				<p class="text-sm text-gray-500">No IP restrictions (all IPs allowed)</p>
			{/if}
		</div>
	</div>

	<!-- Active Status -->
	<div>
		<label class="flex items-center gap-2">
			<input
				type="checkbox"
				bind:checked={client.isActive}
				class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
			/>
			<span class="text-sm font-medium text-gray-700">Client Active</span>
		</label>
	</div>
</div>

<!-- Footer -->
<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
	<button
		onclick={onSave}
		class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
	>
		Save Changes
	</button>
</div>
