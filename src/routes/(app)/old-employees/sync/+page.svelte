<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let syncSource = $state<'entraid' | 'csv'>('entraid');
	let csvFile = $state<File | null>(null);
	let comparing = $state(false);
	let comparisonResult = $state<any>(null);
	let selectedChanges = $state<Set<string>>(new Set());

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			csvFile = target.files[0];
		}
	}

	async function loadComparison() {
		comparing = true;
		// TODO: Implement actual API call
		setTimeout(() => {
			comparisonResult = data.mockComparison;
			comparing = false;
		}, 1000);
	}

	function toggleChange(changeId: string) {
		if (selectedChanges.has(changeId)) {
			selectedChanges.delete(changeId);
		} else {
			selectedChanges.add(changeId);
		}
		selectedChanges = new Set(selectedChanges);
	}

	function selectAll() {
		if (comparisonResult) {
			selectedChanges = new Set(comparisonResult.differences.map((d: any) => d.id));
		}
	}

	function deselectAll() {
		selectedChanges = new Set();
	}
</script>

<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">🔄</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Data Sync & Comparison</h3>
				<p class="mt-1 text-sm text-blue-700">
					Bandingkan data karyawan di database aplikasi dengan sumber eksternal (Microsoft Entra ID atau CSV upload).
					Anda dapat memilih perubahan mana yang akan diterapkan dan ke sistem mana (App DB, Entra ID, atau keduanya).
				</p>
			</div>
		</div>
	</div>

	<!-- Header -->
	<div>
		<h2 class="text-2xl font-bold text-gray-900">Sinkronisasi Data Karyawan</h2>
		<p class="text-sm text-gray-500 mt-1">Bandingkan dan sinkronkan data dari berbagai sumber</p>
	</div>

	<!-- Source Selection -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium mb-4">1️⃣ Pilih Sumber Data</h3>

		<div class="grid grid-cols-2 gap-4 mb-4">
			<button
				onclick={() => syncSource = 'entraid'}
				class="p-4 border-2 rounded-lg text-left transition-colors {syncSource === 'entraid' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">☁️ Microsoft Entra ID</div>
						<div class="text-sm text-gray-500 mt-1">Sinkronisasi dari cloud Microsoft</div>
					</div>
					{#if syncSource === 'entraid'}
						<span class="text-indigo-600 text-xl">✓</span>
					{/if}
				</div>
			</button>

			<button
				onclick={() => syncSource = 'csv'}
				class="p-4 border-2 rounded-lg text-left transition-colors {syncSource === 'csv' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">📄 Upload CSV</div>
						<div class="text-sm text-gray-500 mt-1">Import dari file CSV</div>
					</div>
					{#if syncSource === 'csv'}
						<span class="text-indigo-600 text-xl">✓</span>
					{/if}
				</div>
			</button>
		</div>

		{#if syncSource === 'csv'}
			<div class="mt-4">
				<label class="block text-sm font-medium text-gray-700 mb-2">Upload File CSV</label>
				<input
					type="file"
					accept=".csv"
					onchange={handleFileChange}
					class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
				/>
				{#if csvFile}
					<p class="text-sm text-gray-500 mt-2">📎 {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)</p>
				{/if}
			</div>
		{/if}

		<div class="mt-4">
			<button
				onclick={loadComparison}
				disabled={comparing || (syncSource === 'csv' && !csvFile)}
				class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{comparing ? '⏳ Memuat...' : '🔍 Mulai Perbandingan'}
			</button>
		</div>
	</div>

	<!-- Comparison Results -->
	{#if comparisonResult}
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-medium">2️⃣ Review Perbedaan Data</h3>
				<div class="space-x-2">
					<button onclick={selectAll} class="text-sm text-indigo-600 hover:text-indigo-800">Pilih Semua</button>
					<button onclick={deselectAll} class="text-sm text-gray-600 hover:text-gray-800">Hapus Semua</button>
				</div>
			</div>

			<!-- Summary Stats -->
			<div class="grid grid-cols-4 gap-4 mb-6">
				<div class="bg-blue-50 p-3 rounded">
					<div class="text-2xl font-bold text-blue-600">{comparisonResult.stats.total}</div>
					<div class="text-xs text-blue-800">Total Records</div>
				</div>
				<div class="bg-green-50 p-3 rounded">
					<div class="text-2xl font-bold text-green-600">{comparisonResult.stats.matches}</div>
					<div class="text-xs text-green-800">Cocok</div>
				</div>
				<div class="bg-yellow-50 p-3 rounded">
					<div class="text-2xl font-bold text-yellow-600">{comparisonResult.stats.conflicts}</div>
					<div class="text-xs text-yellow-800">Konflik</div>
				</div>
				<div class="bg-purple-50 p-3 rounded">
					<div class="text-2xl font-bold text-purple-600">{comparisonResult.stats.newRecords}</div>
					<div class="text-xs text-purple-800">Data Baru</div>
				</div>
			</div>

			<!-- Differences Table -->
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								<input type="checkbox" class="rounded" />
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">App DB</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{syncSource === 'entraid' ? 'Entra ID' : 'CSV'}</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each comparisonResult.differences as diff}
							<tr class="hover:bg-gray-50 {selectedChanges.has(diff.id) ? 'bg-indigo-50' : ''}">
								<td class="px-3 py-4">
									<input
										type="checkbox"
										checked={selectedChanges.has(diff.id)}
										onchange={() => toggleChange(diff.id)}
										class="rounded"
									/>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">{diff.employeeName}</div>
									<div class="text-xs text-gray-500">{diff.employeeId}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
										{diff.field}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">{diff.appValue || '-'}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900 {diff.sourceValue !== diff.appValue ? 'font-medium text-yellow-600' : ''}">
										{diff.sourceValue || '-'}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm">
									<select class="text-xs border rounded px-2 py-1">
										<option value="use-app">Keep App DB</option>
										<option value="use-source" selected>Use {syncSource === 'entraid' ? 'Entra ID' : 'CSV'}</option>
										<option value="use-both">Sync Both Ways</option>
										<option value="skip">Skip</option>
									</select>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Apply Changes -->
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium mb-4">3️⃣ Terapkan Perubahan</h3>

			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
				<p class="text-sm text-yellow-800">
					⚠️ <strong>{selectedChanges.size}</strong> perubahan akan diterapkan. Pastikan Anda sudah review semua perubahan sebelum melanjutkan.
				</p>
			</div>

			<div class="flex items-center space-x-4">
				<button
					disabled={selectedChanges.size === 0}
					class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					✓ Terapkan {selectedChanges.size} Perubahan
				</button>
				<button class="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
					📥 Export Preview
				</button>
			</div>
		</div>
	{/if}

	<!-- Sync History -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium mb-4">📊 Riwayat Sinkronisasi</h3>

		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes Applied</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.syncHistory as sync}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{new Date(sync.timestamp).toLocaleString('id-ID')}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="px-2 py-1 text-xs font-semibold rounded {sync.source === 'entraid' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
									{sync.source === 'entraid' ? '☁️ Entra ID' : '📄 CSV'}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{sync.changesApplied} records
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="px-2 py-1 text-xs font-semibold rounded {sync.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
									{sync.status === 'success' ? '✓ Success' : '✗ Failed'}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{sync.user}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
