<script lang="ts">
	import { maskField } from '$lib/utils/data-masking';
	import type { PageData } from './$types';
	import type { MaskType, MaskingRule } from '$lib/utils/data-masking';
	import PageHints from '$lib/components/PageHints.svelte';
	import { useLogger } from '$lib/logger';
	import { formEnhance } from '$lib/utils/form-enhance';

	const log = useLogger({ module: 'app:data-masking' });

	let { data }: { data: PageData } = $props();

	let config = $state(data.config);
	let isEditing = $state(false);
	let showAddRule = $state(false);
	let showPageHints = $state(false);

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
			log.error('Failed to load discovered fields', { error });
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

	function startEditing() { isEditing = true; }

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
		<div>
			<button class="px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer"
				onclick={() => (showPageHints = true)} > ℹ️ </button>	
			{#if !isEditing}
			<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				onclick={startEditing} > Edit Configuration </button>
			{/if}
		</div>
	</div>

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
					<input class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						type="checkbox" bind:checked={config.enabled} />
					<span class="text-sm font-medium text-gray-700">Enable Masking</span>
				</label>
			{:else}
				<span class="px-3 py-1 text-xs font-semibold rounded-full {config.enabled
						? 'bg-green-100 text-green-800'
						: 'bg-red-100 text-red-800'}" >
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
				<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					placeholder="admin, superadmin, auditor" type="text" bind:value={config.exemptRoles} />
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
				<button class="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
					onclick={() => (showAddRule = !showAddRule)} >
					{showAddRule ? 'Cancel' : '+ Add Rule'}
				</button>
			{/if}
		</div>

		<!-- Add Rule Form -->
		{#if showAddRule}
			<form method="POST" action="?/addRule" use:formEnhance={{ success: 'Rule berhasil ditambahkan', onSuccess: () => { showAddRule = false; resetNewRule(); } }} class="mb-4 p-4 bg-gray-50 rounded-md">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<div class="flex justify-between items-center mb-1">
							<label class="block text-sm font-medium text-gray-700">Field Path</label>
							<button class="text-xs text-indigo-600 hover:text-indigo-800"
								type="button" onclick={toggleFieldBrowser} >
								{showFieldBrowser ? 'Close Browser' : '🔍 Browse Available Fields'}
							</button>
						</div>
						<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							type="text" name="field" placeholder="e.g., email, customProperties.ktp"
							bind:value={newRule.field} required />

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
													<button class="block w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
														type="button" onclick={() => selectField(field)} >
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
						<select class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							name="type" bind:value={newRule.type} >
							{#each maskTypes as maskType}
								<option value={maskType.value}>{maskType.label}</option>
							{/each}
						</select>
					</div>

					{#if newRule.type === 'custom' || newRule.type === 'phone' || newRule.type === 'ktp'}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Show First</label>
							<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
								type="number" name="showFirst" min="0" placeholder="3"
								bind:value={newRule.showFirst} />
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Show Last</label>
							<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
								type="number" name="showLast" min="0" placeholder="3"
								bind:value={newRule.showLast} />
						</div>
					{/if}

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Mask Character</label>
						<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
							type="text" name="maskChar" maxlength="1" placeholder="*"
							bind:value={newRule.maskChar} />
					</div>
				</div>

				<div class="flex justify-end gap-2 mt-4">
					<button class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						type="button" onclick={resetNewRule} > Cancel </button>
					<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						type="submit" > Add Rule </button>
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
								<form method="POST" action="?/deleteRule" use:formEnhance={'Rule berhasil dihapus'}>
									<input type="hidden" name="index" value={index} />
									<button class="text-red-600 hover:text-red-800 text-sm font-medium"
										type="submit" > Delete </button>
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
				<select class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					bind:value={previewType} >
					{#each maskTypes as maskType}
						<option value={maskType.value}>{maskType.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Test Value</label>
				<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
					type="text" placeholder="Enter value to test..." 
					bind:value={previewValue} />
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
	<form method="POST" action="?/update" use:formEnhance={{ success: 'Konfigurasi berhasil disimpan', onSuccess: () => { isEditing = false; } }}>
		<input type="hidden" name="enabled" value={config.enabled} />
		<input type="hidden" name="rules" value={JSON.stringify(config.rules)} />
		<input type="hidden"
			name="exemptRoles"
			value={Array.isArray(config.exemptRoles)
				? config.exemptRoles.join(', ')
				: config.exemptRoles} />

		<div class="flex justify-end gap-3">
			<button class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
				type="button" onclick={cancelEditing} > Cancel </button>
			<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				type="submit" > Save Changes </button>
		</div>
	</form>
	{/if}
</div>

<PageHints bind:visible={showPageHints}
	title='How Data Masking Works'
	paragraph='<ul class="mt-1 text-sm text-blue-700 text-sm text-blue-800 space-y-1">
		<li>• <strong>Database storage:</strong> Original unmasked data remains intact in the database</li>
		<li>• <strong>API layer masking:</strong> Data is masked when served through API endpoints (e.g., /api/identities/search)</li>
		<li>• <strong>Role-based access:</strong> Users with exempt roles (admin, superadmin) always see unmasked data</li>
		<li>• <strong>No data loss:</strong> Masking is reversible - original data is never modified</li>
		<li>• <strong>Field discovery:</strong> Click "Browse Available Fields" to see all existing fields in your identities collection</li>
	</ul>' />
