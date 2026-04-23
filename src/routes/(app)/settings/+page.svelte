<script lang="ts">
	import type { PageData } from './$types';
	import MailerModal from './MailerModal.svelte';
	import Input from '$lib/components/Input.svelte';
	import { formEnhance } from '$lib/utils/form-enhance';

	let { data }: { data: PageData } = $props();
	let editedSettings: Record<string, any> = $state({});
	let actMailer: any = $state(null);

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

	const EXCLUDED_CATEGORIES = new Set(['privacy', 'email']);

	const settingsByCategory = $derived(() => {
		const grouped: Record<string, any[]> = {};
		data.settings.forEach((setting: any) => {
			if (EXCLUDED_CATEGORIES.has(setting.category)) return;
			if (!grouped[setting.category]) grouped[setting.category] = [];
			grouped[setting.category].push(setting);
		});
		return grouped;
	});

	// Get setting value (edited or original)
	function getSettingValue(setting: any) {
		if ( editedSettings[setting.key] !== undefined ) {
			return editedSettings[setting.key];
		}
		if (setting.type === 'duration') {
			return getDurationValue(setting.value, 'hours');
		}
		return setting.value;
	}
	const sets: Record<string, any> = {}
	data.settings.forEach(x => { sets[x.key] = x });

	// DB value (seeded from DEFAULT_SETTINGS) is the canonical provider template+values
	const emailConfig: Record<string, Record<string, any>> = sets.email_service_config?.value ?? {};

	const pvdopt: Record<string, string> = Object.fromEntries(Object.keys(emailConfig).map(p => [p, p]));

	let selectedProvider = $state<string>(sets.email_service_provider?.value ?? Object.keys(pvdopt)[0]);
</script>

<div class="space-y-6">
	<form method="POST" action="?/update" use:formEnhance={'Pengaturan berhasil disimpan'}>
	<!-- Header -->
		<div class="flex justify-between items-center my-2">
			<div>
				<h2 class="text-2xl font-bold text-gray-900">System Settings</h2>
				<p class="text-sm text-gray-500">Configure global SSO settings</p>
			</div>
			<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				type="submit" > Save Changes
			</button>
		</div>


{#each Object.entries(settingsByCategory()) as [category, settings]}
		<div class="bg-white shadow rounded-lg p-4 my-2">
			<h3 class="text-lg font-medium text-gray-900 capitalize">{category} Settings</h3>
			{#each settings as setting}
				<div class="flex items-center justify-between border-b border-gray-200 my-2">
					<div class="flex-1">
						<label class="block text-sm font-medium text-gray-900">{setting.label}</label>
						{#if setting.description}
							<p class="text-xs text-gray-500 mt-1">{setting.description}</p>
						{/if}
					</div>
					<div class="ml-4">
						{#if setting.type === 'boolean'}
							<input type="hidden" name="setting_{setting.key}_type" value="boolean" />
							<label class="flex items-center gap-2">
								<input class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
									type="checkbox" name="setting_{setting.key}"
									bind:checked={editedSettings[setting.key]} value="true" />
								<span class="text-sm text-gray-700">Enabled</span>
							</label>
						{:else if setting.type === 'duration'}
							<div class="flex items-center gap-2">
								<input class="w-24 border rounded-md focus:ring-2 focus:ring-indigo-500"
									type="number" name="setting_{setting.key}" min="1"
									value={getSettingValue(setting)}
									onchange={(e) => {
										const hours = parseInt(e.currentTarget.value);
										editedSettings[setting.key] = toSeconds(hours, 'hours');
									}} />
								<span class="text-sm text-gray-700">hours</span>
							</div>
						{:else if setting.type === 'number'}
							<div class="flex items-center gap-2">
								<input class="w-24 border rounded-md focus:ring-2 focus:ring-indigo-500"
									type="number" name="setting_{setting.key}" min="1"
									value={getSettingValue(setting)}
									onchange={(e) => (editedSettings[setting.key] = parseInt(e.currentTarget.value))} />
								{#if setting.unit}
									<span class="text-sm text-gray-700">{setting.unit}</span>
								{/if}
							</div>
						{:else if setting.type === 'json'}
							{#each Object.entries(getSettingValue(setting)) as [k, v]}
								<p class="border-t">Provider:<span class="font-bold"> {k}</span></p>
								<div class="grid grid-cols-4 gap-2 mb-1">
									{#each Object.entries(v as Object) as [kk, vv]}
										<label for="">{kk}</label>
										<input class="w-64 border rounded-md focus:ring-2 focus:ring-indigo-500"
											type="text" name="{kk}" value={vv} />
									{/each}
								</div>
							{/each}
						{:else}
							<input class="w-64 border rounded-md focus:ring-2 focus:ring-indigo-500"
								type="text" name="setting_{setting.key}"
								value={getSettingValue(setting)}
								onchange={(e) => (editedSettings[setting.key] = e.currentTarget.value)} />
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/each}
	</form>

	<form method="POST" action="?/update-default-email-provider" use:formEnhance={'Email settings berhasil disimpan'}>
		<!-- Email Settings (excluded from generic each, rendered explicitly) -->
		<div class="bg-white shadow rounded-lg p-4 mb-2">
			<div class="flex items-center justify-between border-b border-gray-200 p-2 my-2">
				<h3 class="text-lg font-medium text-gray-900 capitalize">Email Settings</h3>
				<button class="px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					type="submit" > Save Changes
				</button>
			</div>
			<div class="flex items-center justify-between border-b border-gray-200 my-2">
				<div class="flex-1">
					<label class="block text-sm font-medium text-gray-900">{sets.email_service_provider.label}</label>
					<p class="text-xs text-gray-500 mt-1">{sets.email_service_provider.description}</p>
				</div>
				<div class="ml-4">
					<Input type="select" name="settings_email_service_provider" bind:value={selectedProvider} options={pvdopt} />
				</div>
			</div>
			<div>
				{#each Object.entries(emailConfig[selectedProvider] ?? {}) as [k, v]}
					<Input type="text" label={k} name="settings_email_service_config_{selectedProvider}_{k}" value={String(v)} />
				{/each}
			</div>
		</div>
	</form>
</div>

<!-- Email: per-realm mailer config table -->
<div class="bg-white shadow rounded-lg p-4 my-2">
	<div class="flex items-center justify-between mb-2">
		<div>
			<h3 class="text-lg font-medium text-gray-900">Email Transport</h3>
			<p class="text-xs text-gray-500 mt-0.5">
				Fallback chain: realm transport → Email Settings above → none.
			</p>
		</div>
	</div>
	<table class="w-full text-sm">
		<thead>
			<tr class="border-b border-gray-200 text-xs text-gray-500 uppercase">
				<th class="text-left py-2 pr-4 font-medium">Code</th>
				<th class="text-left py-2 pr-4 font-medium">Realm</th>
				<th class="text-left py-2 pr-4 font-medium">Provider</th>
				<th class="text-left py-2 font-medium">From</th>
				<th></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-gray-100">
			{#each data.realms as realm}
				{@const transport = (realm as any).emailTransport}
				{@const branding = (realm as any).branding}
				<tr class="hover:bg-gray-50">
					<td class="py-2 pr-4">
						<span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">{realm.code}</span>
					</td>
					<td class="py-2 pr-4 font-medium text-gray-900">{realm.name}</td>
					<td class="py-2 pr-4">
						{#if transport?.provider}
							<span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium capitalize">
								{transport.provider.replace('_', ' ')}
							</span>
						{:else}
							<span class="text-gray-400 text-xs">not Configured</span>
						{/if}
					</td>
					<td class="py-2 text-gray-500 text-xs">
						{branding?.emailFromAddress || '—'}
					</td>
					<td class="py-2 text-right">
						<button class="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
							onclick={() => { actMailer = { ...realm }; }} > Configure </button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
{#if actMailer}
	<MailerModal bind:form={actMailer} />
{/if}
