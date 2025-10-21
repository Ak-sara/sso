<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData; } = $props();
	
</script>
<div class="space-y-6">
    <!-- Realm Settings Summary -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Pengaturan Realm Global</h3>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-900">Token Expiration</p>
						<p class="text-xs text-gray-500">Default untuk semua realm</p>
					</div>
					<span class="text-sm font-semibold text-indigo-600">1 hour</span>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-900">Refresh Token</p>
						<p class="text-xs text-gray-500">Masa aktif refresh token</p>
					</div>
					<span class="text-sm font-semibold text-indigo-600">30 days</span>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-900">Session Timeout</p>
						<p class="text-xs text-gray-500">Idle session timeout</p>
					</div>
					<span class="text-sm font-semibold text-indigo-600">7 days</span>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-900">Total Realms</p>
						<p class="text-xs text-gray-500">Organisasi terdaftar</p>
					</div>
					<span class="text-sm font-semibold text-indigo-600">{data.realms.length}</span>
				</div>
			</div>
		</div>
	</div>
</div>