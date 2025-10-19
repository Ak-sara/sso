<script lang="ts">
	interface Props {
		total: number;
		matches?: number;
		conflicts?: number;
		newRecords?: number;
		toCreate?: number;
		toUpdate?: number;
		warnings?: number;
		errors?: number;
	}

	let {
		total,
		matches = 0,
		conflicts = 0,
		newRecords = 0,
		toCreate = 0,
		toUpdate = 0,
		warnings = 0,
		errors = 0
	}: Props = $props();

	interface Stat {
		label: string;
		value: number;
		icon: string;
		color: string;
	}

	const stats = $derived<Stat[]>([
		...(total > 0 ? [{ label: 'Total Records', value: total, icon: '📊', color: 'bg-blue-100 text-blue-800' }] : []),
		...(matches > 0 ? [{ label: 'Matches', value: matches, icon: '✅', color: 'bg-green-100 text-green-800' }] : []),
		...(newRecords > 0 ? [{ label: 'New Records', value: newRecords, icon: '➕', color: 'bg-indigo-100 text-indigo-800' }] : []),
		...(toCreate > 0 ? [{ label: 'Will Be Created', value: toCreate, icon: '➕', color: 'bg-green-100 text-green-800' }] : []),
		...(toUpdate > 0 ? [{ label: 'Will Be Updated', value: toUpdate, icon: '🔄', color: 'bg-blue-100 text-blue-800' }] : []),
		...(conflicts > 0 ? [{ label: 'Conflicts', value: conflicts, icon: '⚠️', color: 'bg-yellow-100 text-yellow-800' }] : []),
		...(warnings > 0 ? [{ label: 'Warnings', value: warnings, icon: '⚠️', color: 'bg-yellow-100 text-yellow-800' }] : []),
		...(errors > 0 ? [{ label: 'Errors', value: errors, icon: '❌', color: 'bg-red-100 text-red-800' }] : []),
	]);
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
	{#each stats as stat}
		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<span class="text-3xl">{stat.icon}</span>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">
								{stat.label}
							</dt>
							<dd class="flex items-baseline">
								<div class="text-2xl font-semibold text-gray-900">
									{stat.value.toLocaleString()}
								</div>
							</dd>
						</dl>
					</div>
				</div>
			</div>
			<div class="px-5 py-3 {stat.color}">
				<div class="text-sm text-center font-medium">
					{#if stat.label === 'Conflicts' && stat.value > 0}
						Requires resolution
					{:else if stat.label === 'Errors' && stat.value > 0}
						Review before proceeding
					{:else if stat.label === 'Warnings' && stat.value > 0}
						Review recommended
					{:else if stat.label === 'Will Be Created'}
						New identities (isActive: true)
					{:else if stat.label === 'Will Be Updated'}
						Status preserved
					{:else}
						{stat.label}
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>
