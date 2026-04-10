<script lang="ts">
	interface Props {
		client: any;
		onSave: () => void;
	}

	let { client = $bindable(), onSave }: Props = $props();

	function addRedirectUri() {
		if (!client.redirectUris) client.redirectUris = [];
		client.redirectUris = [...client.redirectUris, ''];
	}

	function removeRedirectUri(index: number) {
		client.redirectUris = client.redirectUris.filter((_: any, i: number) => i !== index);
	}

	function addScope() {
		if (!client.allowedScopes) client.allowedScopes = [];
		client.allowedScopes = [...client.allowedScopes, ''];
	}

	function removeScope(index: number) {
		client.allowedScopes = client.allowedScopes.filter((_: any, i: number) => i !== index);
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

	<!-- Redirect URIs -->
	<div>
		<div class="flex justify-between items-center mb-2">
			<label class="block text-sm font-medium text-gray-700">Redirect URIs</label>
			<button
				type="button"
				onclick={addRedirectUri}
				class="text-sm text-indigo-600 hover:text-indigo-800"
			>
				+ Add URI
			</button>
		</div>
		<div class="space-y-2">
			{#each client.redirectUris || [] as uri, index}
				<div class="flex gap-2">
					<input
						type="url"
						bind:value={client.redirectUris[index]}
						placeholder="https://example.com/callback"
						class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
					<button
						type="button"
						onclick={() => removeRedirectUri(index)}
						class="px-3 py-2 text-red-600 hover:text-red-800"
					>
						Remove
					</button>
				</div>
			{/each}
		</div>
	</div>

	<!-- Allowed Scopes -->
	<div>
		<div class="flex justify-between items-center mb-2">
			<label class="block text-sm font-medium text-gray-700">Allowed Scopes</label>
			<button
				type="button"
				onclick={addScope}
				class="text-sm text-indigo-600 hover:text-indigo-800"
			>
				+ Add Scope
			</button>
		</div>
		<div class="space-y-2">
			{#each client.allowedScopes || [] as scope, index}
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={client.allowedScopes[index]}
						placeholder="openid"
						class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
					<button
						type="button"
						onclick={() => removeScope(index)}
						class="px-3 py-2 text-red-600 hover:text-red-800"
					>
						Remove
					</button>
				</div>
			{/each}
		</div>
	</div>

	<!-- Grant Types (read-only) -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Grant Types</label>
		<div class="flex flex-wrap gap-2">
			{#each client.grantTypes || [] as grantType}
				<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{grantType}</span>
			{/each}
		</div>
		<p class="text-xs text-gray-500 mt-1">Grant types cannot be modified</p>
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
