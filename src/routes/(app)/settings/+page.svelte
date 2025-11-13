<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let isEditing = $state(false);
	let editedSettings: Record<string, any> = $state({});

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
		isEditing = true;
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
		{/each}

		
	</form>

</div>
