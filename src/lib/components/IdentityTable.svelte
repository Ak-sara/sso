<script lang="ts">
	import type { Identity } from '$lib/db/schemas';

	interface Props {
		identities: Identity[];
		identityType: 'employee' | 'partner' | 'external' | 'service_account';
		showActions?: boolean;
		onEdit?: (identity: Identity) => void;
		onToggleActive?: (identity: Identity) => void;
		onDelete?: (identity: Identity) => void;
	}

	let {
		identities,
		identityType,
		showActions = true,
		onEdit,
		onToggleActive,
		onDelete
	}: Props = $props();

	function getStatusBadge(isActive: boolean): string {
		return isActive
			? 'bg-green-100 text-green-800'
			: 'bg-red-100 text-red-800';
	}

	function getEmploymentTypeBadge(type?: string): string {
		switch (type) {
			case 'permanent': return 'bg-blue-100 text-blue-800';
			case 'pkwt': return 'bg-yellow-100 text-yellow-800';
			case 'outsource': return 'bg-purple-100 text-purple-800';
			case 'contract': return 'bg-gray-100 text-gray-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}

	function getEmploymentStatusBadge(status?: string): string {
		switch (status) {
			case 'active': return 'bg-green-100 text-green-800';
			case 'probation': return 'bg-yellow-100 text-yellow-800';
			case 'terminated': return 'bg-red-100 text-red-800';
			case 'resigned': return 'bg-gray-100 text-gray-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="overflow-x-auto">
	<table class="min-w-full divide-y divide-gray-200">
		<thead class="bg-gray-50">
			<tr>
				{#if identityType === 'employee'}
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						NIK
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Name
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Email / Username
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Employment Type
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Status
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Active
					</th>
				{:else if identityType === 'partner'}
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Name
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Company
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Email
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Type
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Contract End
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Active
					</th>
				{:else}
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Name
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Email / Username
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Roles
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Active
					</th>
				{/if}

				{#if showActions}
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
						Actions
					</th>
				{/if}
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#each identities as identity (identity._id)}
				<tr class="hover:bg-gray-50 transition-colors">
					{#if identityType === 'employee'}
						<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
							{identity.employeeId || '-'}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-gray-900">{identity.fullName}</div>
							<div class="text-sm text-gray-500">{identity.phone || '-'}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm text-gray-900">{identity.email || identity.username}</div>
							{#if !identity.email}
								<span class="text-xs text-gray-500">(NIK as username)</span>
							{/if}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getEmploymentTypeBadge(identity.employmentType)}">
								{identity.employmentType?.toUpperCase() || '-'}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getEmploymentStatusBadge(identity.employmentStatus)}">
								{identity.employmentStatus || '-'}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusBadge(identity.isActive)}">
								{identity.isActive ? 'Active' : 'Inactive'}
							</span>
						</td>
					{:else if identityType === 'partner'}
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-gray-900">{identity.fullName}</div>
							<div class="text-sm text-gray-500">{identity.phone || '-'}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
							{identity.companyName || '-'}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
							{identity.email || identity.username}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
								{identity.partnerType || '-'}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
							{identity.contractEndDate ? new Date(identity.contractEndDate).toLocaleDateString('id-ID') : '-'}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusBadge(identity.isActive)}">
								{identity.isActive ? 'Active' : 'Inactive'}
							</span>
						</td>
					{:else}
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-gray-900">{identity.fullName}</div>
							<div class="text-sm text-gray-500">{identity.phone || '-'}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
							{identity.email || identity.username}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{identity.roles.join(', ')}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusBadge(identity.isActive)}">
								{identity.isActive ? 'Active' : 'Inactive'}
							</span>
						</td>
					{/if}

					{#if showActions}
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
							<div class="flex justify-end space-x-2">
								{#if onEdit}
									<button
										type="button"
										onclick={() => onEdit?.(identity)}
										class="text-indigo-600 hover:text-indigo-900"
									>
										Edit
									</button>
								{/if}
								{#if onToggleActive}
									<button
										type="button"
										onclick={() => onToggleActive?.(identity)}
										class="text-blue-600 hover:text-blue-900"
									>
										{identity.isActive ? 'Deactivate' : 'Activate'}
									</button>
								{/if}
								{#if onDelete}
									<button
										type="button"
										onclick={() => onDelete?.(identity)}
										class="text-red-600 hover:text-red-900"
									>
										Delete
									</button>
								{/if}
							</div>
						</td>
					{/if}
				</tr>
			{:else}
				<tr>
					<td colspan={identityType === 'employee' ? 7 : identityType === 'partner' ? 7 : 5} class="px-6 py-4 text-center text-sm text-gray-500">
						No identities found
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
