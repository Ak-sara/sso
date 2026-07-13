<script lang="ts">
	interface Props {
		auditLog: any;
		identityInfo?: any;
		organizationInfo?: any;
	}
	let { auditLog, identityInfo, organizationInfo }: Props = $props();

	const getActionIcon = (action: string) => {
		const icons: Record<string, string> = {
			login: '🔐',
			logout: '🚪',
			'login_failed': '❌',
			'create_identity': '👤',
			'update_identity': '✏️',
			'delete_identity': '🗑️',
			'create_employee': '👨‍💼',
			'update_employee': '✏️',
			'delete_employee': '🗑️',
			'employee_onboard': '🎉',
			'employee_mutation': '🔄',
			'employee_transfer': '🔀',
			'employee_promotion': '⬆️',
			'employee_demotion': '⬇️',
			'employee_offboard': '👋',
			'create_organization': '🏢',
			'update_organization': '🔧',
			'oauth_token_grant': '🔑',
			'oauth_token_refresh': '🔄',
			'access_granted': '✅',
			'access_denied': '❌'
		};
		return icons[action] || '📋';
	};

	const getActionLabel = (action: string) => {
		const labels: Record<string, string> = {
			login: 'Login',
			logout: 'Logout',
			'login_failed': 'Login Failed',
			'create_identity': 'Create Identity',
			'update_identity': 'Update Identity',
			'delete_identity': 'Delete Identity',
			'create_employee': 'Create Employee',
			'update_employee': 'Update Employee',
			'delete_employee': 'Delete Employee',
			'employee_onboard': 'Onboarding',
			'employee_mutation': 'Mutation',
			'employee_transfer': 'Transfer',
			'employee_promotion': 'Promotion',
			'employee_demotion': 'Demotion',
			'employee_offboard': 'Offboarding',
			'create_organization': 'Create Organization',
			'update_organization': 'Update Organization',
			'oauth_token_grant': 'OAuth Token Grant',
			'oauth_token_refresh': 'OAuth Token Refresh',
			'access_granted': 'Access Granted',
			'access_denied': 'Access Denied'
		};
		return labels[action] || action;
	};

	const getStatusBadge = (status: string) => {
		const badges: Record<string, { color: string; label: string }> = {
			success: { color: 'bg-green-100 text-green-800', label: 'Success' },
			failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
			denied: { color: 'bg-yellow-100 text-yellow-800', label: 'Denied' }
		};
		return badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
	};

	const formatTimestamp = (isoString: string) => {
		const date = new Date(isoString);
		return date.toLocaleString('id-ID', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	};
</script>

<div class="px-6 py-4 bg-gray-50 border-b border-gray-200 -mx-4 -mt-4 mb-4">
	<div class="flex items-center space-x-4">
		<span class="text-4xl">{getActionIcon(auditLog.action)}</span>
		<div class="flex-1">
			<h2 class="text-xl font-semibold text-gray-900">{getActionLabel(auditLog.action)}</h2>
			<p class="text-sm text-gray-500">{formatTimestamp(auditLog.timestamp)}</p>
		</div>
		{#if auditLog.details?.status}
			{@const badge = getStatusBadge(auditLog.details.status)}
			<span class="px-3 py-1 rounded-full text-sm font-medium {badge.color}">
				{badge.label}
			</span>
		{/if}
	</div>
</div>

<div class="space-y-6">
	<!-- Identity Info -->
	{#if identityInfo}
		<div>
			<h3 class="text-sm font-medium text-gray-500 mb-2">Dilakukan Oleh</h3>
			<div class="bg-gray-50 rounded-lg p-4">
				<div class="flex items-start space-x-3">
					<div class="flex-shrink-0">
						<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
							<span class="text-blue-600 font-semibold">
								{identityInfo.fullName?.charAt(0) || '?'}
							</span>
						</div>
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-gray-900">{identityInfo.fullName || 'Unknown'}</p>
						{#if identityInfo.email}
							<p class="text-sm text-gray-500">{identityInfo.email}</p>
						{/if}
						{#if identityInfo.employeeId}
							<p class="text-xs text-gray-400">NIK: {identityInfo.employeeId}</p>
						{/if}
						<p class="text-xs text-gray-400 mt-1">
							Type: <span class="px-2 py-0.5 bg-gray-200 rounded">{identityInfo.identityType}</span>
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Resource Info -->
	<div class="grid grid-cols-2 gap-4">
		<div>
			<h3 class="text-sm font-medium text-gray-500 mb-2">Resource</h3>
			<p class="text-sm font-semibold text-gray-900">
				<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
					{auditLog.resource || '-'}
				</span>
			</p>
		</div>

		{#if auditLog.resourceId}
			<div>
				<h3 class="text-sm font-medium text-gray-500 mb-2">Resource ID</h3>
				<p class="text-xs font-mono text-gray-900 bg-gray-100 rounded px-2 py-1 break-all">
					{auditLog.resourceId}
				</p>
			</div>
		{/if}
	</div>

	<!-- Organization Info -->
	{#if organizationInfo}
		<div>
			<h3 class="text-sm font-medium text-gray-500 mb-2">Organisasi</h3>
			<p class="text-sm text-gray-900">
				{organizationInfo.name}
				<span class="text-xs text-gray-500">({organizationInfo.code})</span>
			</p>
		</div>
	{/if}

	<!-- Request Info -->
	{#if auditLog.ipAddress || auditLog.userAgent}
		<div class="border-t border-gray-200 pt-4">
			<h3 class="text-sm font-medium text-gray-500 mb-3">Informasi Request</h3>
			<div class="space-y-2">
				{#if auditLog.ipAddress}
					<div class="flex items-start">
						<span class="text-xs font-medium text-gray-500 w-24">IP Address:</span>
						<span class="text-xs text-gray-900 font-mono">{auditLog.ipAddress}</span>
					</div>
				{/if}
				{#if auditLog.userAgent}
					<div class="flex items-start">
						<span class="text-xs font-medium text-gray-500 w-24">User Agent:</span>
						<span class="text-xs text-gray-600 break-all">{auditLog.userAgent}</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Details -->
	{#if auditLog.details && Object.keys(auditLog.details).length > 0}
		<div class="border-t border-gray-200 pt-4">
			<h3 class="text-sm font-medium text-gray-500 mb-3">Detail Lengkap</h3>
			<div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
				<pre class="text-xs text-green-400 font-mono">{JSON.stringify(auditLog.details, null, 2)}</pre>
			</div>
		</div>
	{/if}
</div>
