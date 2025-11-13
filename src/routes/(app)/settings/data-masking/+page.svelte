<script lang="ts">
	import { enhance } from '$app/forms';
	import { maskField } from '$lib/utils/data-masking';
	import type { PageData, ActionData } from './$types';
	import type { MaskType, MaskingRule } from '$lib/utils/data-masking';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let config = $state(data.config);
	let isEditing = $state(false);
	let showAddRule = $state(false);

	// New rule form state
	let newRule = $state<{
		field: string;
		type: MaskType;
		showFirst?: number;
		showLast?: number;
		maskChar: string;
	}>({
		field: '',
		type: 'custom',
		maskChar: '*'
	});

	// Preview state
	let previewValue = $state('');
	let previewType: MaskType = $state('email');

	// Discovered fields from database
	let discoveredFields = $state<{
		fields: string[];
		categorized: Record<string, string[]>;
		sampleSize: number;
	} | null>(null);
	let isLoadingFields = $state(false);
	let showFieldBrowser = $state(false);

	const maskTypes: { value: MaskType; label: string }[] = [
		{ value: 'email', label: 'Email' },
		{ value: 'phone', label: 'Phone Number' },
		{ value: 'ktp', label: 'KTP (ID Number)' },
		{ value: 'date', label: 'Date' },
		{ value: 'custom', label: 'Custom/Generic' },
		{ value: 'none', label: 'No Masking' }
	];

	// Load discovered fields
	async function loadDiscoveredFields() {
		isLoadingFields = true;
		try {
			const response = await fetch('/api/identities/fields');
			if (response.ok) {
				discoveredFields = await response.json();
			}
		} catch (error) {
			console.error('Failed to load discovered fields:', error);
		} finally {
			isLoadingFields = false;
		}
	}

	// Load fields when showing field browser
	function toggleFieldBrowser() {
		showFieldBrowser = !showFieldBrowser;
		if (showFieldBrowser && !discoveredFields) {
			loadDiscoveredFields();
		}
	}

	// Select a field from browser
	function selectField(field: string) {
		newRule.field = field;
		showFieldBrowser = false;
	}

	function startEditing() {
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		config = data.config;
	}

	function resetNewRule() {
		newRule = {
			field: '',
			type: 'custom',
			maskChar: '*'
		};
		showAddRule = false;
	}

	// Preview masking
	let previewMasked = $derived(() => {
		if (!previewValue) return '';
		return maskField(previewValue, {
			field: 'preview',
			type: previewType,
			showFirst: 3,
			showLast: 3,
			maskChar: '*'
		});
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-start">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">Data Masking Configuration</h2>
			<p class="text-sm text-gray-500 mt-1">
				Configure field masking for UU PDP compliance. Masked data protects personal information
				while allowing authorized users to access it.
			</p>
		</div>
		{#if !isEditing}
			<button
				onclick={startEditing}
				class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
			>
				Edit Configuration
			</button>
		{/if}
	</div>

	<!-- How It Works Info -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex items-start gap-3">
			<span class="text-2xl">ℹ️</span>
			<div class="flex-1">
				<h3 class="text-sm font-semibold text-blue-900 mb-1">How Data Masking Works</h3>
				<ul class="text-sm text-blue-800 space-y-1">
					<li>• <strong>Database storage:</strong> Original unmasked data remains intact in the database</li>
					<li>• <strong>API layer masking:</strong> Data is masked when served through API endpoints (e.g., /api/identities/search)</li>
					<li>• <strong>Role-based access:</strong> Users with exempt roles (admin, superadmin) always see unmasked data</li>
					<li>• <strong>No data loss:</strong> Masking is reversible - original data is never modified</li>
					<li>• <strong>Field discovery:</strong> Click "Browse Available Fields" to see all existing fields in your identities collection</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
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

	<!-- Configuration Status -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex items-center justify-between mb-4">
			<div>
				<h3 class="text-lg font-medium text-gray-900">Masking Status</h3>
				<p class="text-sm text-gray-500">
					Data masking is currently {config.enabled ? 'enabled' : 'disabled'}
				</p>
			</div>
			{#if isEditing}
				<label class="flex items-center gap-2">
					<input
						type="checkbox"
						bind:checked={config.enabled}
						class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
					/>
					<span class="text-sm font-medium text-gray-700">Enable Masking</span>
				</label>
			{:else}
				<span
					class="px-3 py-1 text-xs font-semibold rounded-full {config.enabled
						? 'bg-green-100 text-green-800'
						: 'bg-red-100 text-red-800'}"
				>
					{config.enabled ? 'Enabled' : 'Disabled'}
				</span>
			{/if}
		</div>

		<!-- Exempt Roles -->
		<div class="border-t pt-4">
			<label class="block text-sm font-medium text-gray-700 mb-1">Exempt Roles</label>
			<p class="text-xs text-gray-500 mb-2">
				Users with these roles will see unmasked data. Separate roles with commas.
			</p>
			{#if isEditing}
				<input
					type="text"
					bind:value={config.exemptRoles}
					placeholder="admin, superadmin, auditor"
					class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				/>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#each config.exemptRoles || [] as role}
						<span class="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
							{role}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Masking Rules -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex justify-between items-center mb-4">
			<div>
				<h3 class="text-lg font-medium text-gray-900">Masking Rules</h3>
				<p class="text-sm text-gray-500">Define which fields should be masked and how</p>
			</div>
			{#if isEditing}
				<button
					onclick={() => (showAddRule = !showAddRule)}
					class="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
				>
					{showAddRule ? 'Cancel' : '+ Add Rule'}
				</button>
			{/if}
		</div>

		<!-- Add Rule Form -->
		{#if showAddRule}
			<form method="POST" action="?/addRule" use:enhance class="mb-4 p-4 bg-gray-50 rounded-md">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<div class="flex justify-between items-center mb-1">
							<label class="block text-sm font-medium text-gray-700">Field Path</label>
							<button
								type="button"
								onclick={toggleFieldBrowser}
								class="text-xs text-indigo-600 hover:text-indigo-800"
							>
								{showFieldBrowser ? 'Close Browser' : '🔍 Browse Available Fields'}
							</button>
						</div>
						<input
							type="text"
							name="field"
							bind:value={newRule.field}
							placeholder="e.g., email, customProperties.ktp"
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							required
						/>

						<!-- Field Browser -->
						{#if showFieldBrowser}
							<div class="mt-2 p-3 bg-white border rounded-md max-h-64 overflow-y-auto">
								{#if isLoadingFields}
									<div class="text-center text-gray-500 py-4">
										<span class="inline-block animate-spin">⏳</span> Loading fields...
									</div>
								{:else if discoveredFields}
									<div class="text-xs text-gray-500 mb-2">
										Found {discoveredFields.fields.length} fields (scanned {discoveredFields.sampleSize} identities)
									</div>

									{#each Object.entries(discoveredFields.categorized) as [category, fields]}
										<div class="mb-3">
											<div class="text-xs font-semibold text-gray-700 mb-1">{category}</div>
											<div class="space-y-1">
												{#each fields as field}
													<button
														type="button"
														onclick={() => selectField(field)}
														class="block w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
													>
														<code class="font-mono">{field}</code>
													</button>
												{/each}
											</div>
										</div>
									{/each}
								{:else}
									<div class="text-center text-gray-500">Failed to load fields</div>
								{/if}
							</div>
						{/if}
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Mask Type</label>
						<select
							name="type"
							bind:value={newRule.type}
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						>
							{#each maskTypes as maskType}
								<option value={maskType.value}>{maskType.label}</option>
							{/each}
						</select>
					</div>

					{#if newRule.type === 'custom' || newRule.type === 'phone' || newRule.type === 'ktp'}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Show First</label>
							<input
								type="number"
								name="showFirst"
								bind:value={newRule.showFirst}
								min="0"
								placeholder="3"
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							/>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Show Last</label>
							<input
								type="number"
								name="showLast"
								bind:value={newRule.showLast}
								min="0"
								placeholder="3"
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
					{/if}

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Mask Character</label>
						<input
							type="text"
							name="maskChar"
							bind:value={newRule.maskChar}
							maxlength="1"
							placeholder="*"
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2 mt-4">
					<button
						type="button"
						onclick={resetNewRule}
						class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						Add Rule
					</button>
				</div>
			</form>
		{/if}

		<!-- Rules List -->
		<div class="space-y-2">
			{#if config.rules && config.rules.length > 0}
				{#each config.rules as rule, index}
					<div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-3">
									<span class="font-mono text-sm font-medium text-indigo-600">{rule.field}</span>
									<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
										{rule.type}
									</span>
									{#if rule.showFirst !== undefined}
										<span class="text-xs text-gray-500">First: {rule.showFirst}</span>
									{/if}
									{#if rule.showLast !== undefined}
										<span class="text-xs text-gray-500">Last: {rule.showLast}</span>
									{/if}
									{#if rule.maskChar && rule.maskChar !== '*'}
										<span class="text-xs text-gray-500">Char: {rule.maskChar}</span>
									{/if}
								</div>
							</div>

							{#if isEditing}
								<form method="POST" action="?/deleteRule" use:enhance>
									<input type="hidden" name="index" value={index} />
									<button
										type="submit"
										class="text-red-600 hover:text-red-800 text-sm font-medium"
									>
										Delete
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			{:else}
				<div class="text-center py-8 text-gray-500">
					<p>No masking rules configured</p>
					<p class="text-sm">Add rules to protect sensitive data</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Preview Tool -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Masking Preview</h3>
		<p class="text-sm text-gray-500 mb-4">
			Test how different mask types work with your data
		</p>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Mask Type</label>
				<select
					bind:value={previewType}
					class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				>
					{#each maskTypes as maskType}
						<option value={maskType.value}>{maskType.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Test Value</label>
				<input
					type="text"
					bind:value={previewValue}
					placeholder="Enter value to test..."
					class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				/>
			</div>
		</div>

		{#if previewValue}
			<div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">Original</label>
						<div class="font-mono text-sm text-gray-900">{previewValue}</div>
					</div>
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">Masked</label>
						<div class="font-mono text-sm text-indigo-600">{previewMasked()}</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Save/Cancel Actions -->
	{#if isEditing}
		<form method="POST" action="?/update" use:enhance>
			<input type="hidden" name="enabled" value={config.enabled} />
			<input type="hidden" name="rules" value={JSON.stringify(config.rules)} />
			<input
				type="hidden"
				name="exemptRoles"
				value={Array.isArray(config.exemptRoles)
					? config.exemptRoles.join(', ')
					: config.exemptRoles}
			/>

			<div class="flex justify-end gap-3">
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
		</form>
	{/if}
</div>
