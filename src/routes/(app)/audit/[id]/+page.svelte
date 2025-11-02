<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
			'login_failed': 'Login Gagal',
			'create_identity': 'Buat Identitas',
			'update_identity': 'Update Identitas',
			'delete_identity': 'Hapus Identitas',
			'create_employee': 'Buat Karyawan',
			'update_employee': 'Update Karyawan',
			'delete_employee': 'Hapus Karyawan',
			'employee_onboard': 'Onboarding',
			'employee_mutation': 'Mutasi',
			'employee_transfer': 'Transfer',
			'employee_promotion': 'Promosi',
			'employee_demotion': 'Demosi',
			'employee_offboard': 'Offboarding',
			'create_organization': 'Buat Organisasi',
			'update_organization': 'Update Organisasi',
			'oauth_token_grant': 'Grant Token OAuth',
			'oauth_token_refresh': 'Refresh Token OAuth',
			'access_granted': 'Akses Diberikan',
			'access_denied': 'Akses Ditolak'
		};
		return labels[action] || action;
	};

	const getStatusBadge = (status: string) => {
		const badges: Record<string, { color: string; label: string }> = {
			success: { color: 'bg-green-100 text-green-800', label: 'Berhasil' },
			failed: { color: 'bg-red-100 text-red-800', label: 'Gagal' },
			denied: { color: 'bg-yellow-100 text-yellow-800', label: 'Ditolak' }
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

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<a href="/audit" class="text-gray-500 hover:text-gray-700">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Detail Log Audit</h1>
				<p class="text-sm text-gray-500">ID: {data.auditLog._id}</p>
			</div>
		</div>
	</div>

	<!-- Main Info Card -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
			<div class="flex items-center space-x-4">
				<span class="text-4xl">{getActionIcon(data.auditLog.action)}</span>
				<div class="flex-1">
					<h2 class="text-xl font-semibold text-gray-900">{getActionLabel(data.auditLog.action)}</h2>
					<p class="text-sm text-gray-500">{formatTimestamp(data.auditLog.timestamp)}</p>
				</div>
				{#if data.auditLog.details?.status}
					{@const badge = getStatusBadge(data.auditLog.details.status)}
					<span class="px-3 py-1 rounded-full text-sm font-medium {badge.color}">
						{badge.label}
					</span>
				{/if}
			</div>
		</div>

		<div class="px-6 py-4 space-y-6">
			<!-- Identity Info -->
			{#if data.identityInfo}
				<div>
					<h3 class="text-sm font-medium text-gray-500 mb-2">Dilakukan Oleh</h3>
					<div class="bg-gray-50 rounded-lg p-4">
						<div class="flex items-start space-x-3">
							<div class="flex-shrink-0">
								<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
									<span class="text-blue-600 font-semibold">
										{data.identityInfo.fullName?.charAt(0) || '?'}
									</span>
								</div>
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-gray-900">{data.identityInfo.fullName || 'Unknown'}</p>
								{#if data.identityInfo.email}
									<p class="text-sm text-gray-500">{data.identityInfo.email}</p>
								{/if}
								{#if data.identityInfo.employeeId}
									<p class="text-xs text-gray-400">NIK: {data.identityInfo.employeeId}</p>
								{/if}
								<p class="text-xs text-gray-400 mt-1">
									Type: <span class="px-2 py-0.5 bg-gray-200 rounded">{data.identityInfo.identityType}</span>
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
							{data.auditLog.resource || '-'}
						</span>
					</p>
				</div>

				{#if data.auditLog.resourceId}
					<div>
						<h3 class="text-sm font-medium text-gray-500 mb-2">Resource ID</h3>
						<p class="text-xs font-mono text-gray-900 bg-gray-100 rounded px-2 py-1 break-all">
							{data.auditLog.resourceId}
						</p>
					</div>
				{/if}
			</div>

			<!-- Organization Info -->
			{#if data.organizationInfo}
				<div>
					<h3 class="text-sm font-medium text-gray-500 mb-2">Organisasi</h3>
					<p class="text-sm text-gray-900">
						{data.organizationInfo.name}
						<span class="text-xs text-gray-500">({data.organizationInfo.code})</span>
					</p>
				</div>
			{/if}

			<!-- Request Info -->
			{#if data.auditLog.ipAddress || data.auditLog.userAgent}
				<div class="border-t border-gray-200 pt-4">
					<h3 class="text-sm font-medium text-gray-500 mb-3">Informasi Request</h3>
					<div class="space-y-2">
						{#if data.auditLog.ipAddress}
							<div class="flex items-start">
								<span class="text-xs font-medium text-gray-500 w-24">IP Address:</span>
								<span class="text-xs text-gray-900 font-mono">{data.auditLog.ipAddress}</span>
							</div>
						{/if}
						{#if data.auditLog.userAgent}
							<div class="flex items-start">
								<span class="text-xs font-medium text-gray-500 w-24">User Agent:</span>
								<span class="text-xs text-gray-600 break-all">{data.auditLog.userAgent}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Details -->
			{#if data.auditLog.details && Object.keys(data.auditLog.details).length > 0}
				<div class="border-t border-gray-200 pt-4">
					<h3 class="text-sm font-medium text-gray-500 mb-3">Detail Lengkap</h3>
					<div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
						<pre class="text-xs text-green-400 font-mono">{JSON.stringify(data.auditLog.details, null, 2)}</pre>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
