<script lang="ts">
	import SyncStatsCard from './SyncStatsCard.svelte';
	import type { Identity } from '$lib/db/schemas';

	interface Props {
		onUpload?: (file: File) => Promise<void>;
		onDownloadTemplate?: () => void;
		onApplyImport?: () => Promise<void>;
		preview?: {
			toCreate: Array<Partial<Identity>>;
			toUpdate: Array<{ identity: Identity; changes: Partial<Identity> }>;
			warnings: Array<{ row: any; warning: string }>;
			errors: Array<{ row: any; error: string }>;
		} | null;
		isUploading?: boolean;
		isApplying?: boolean;
	}

	let {
		onUpload,
		onDownloadTemplate,
		onApplyImport,
		preview = null,
		isUploading = false,
		isApplying = false
	}: Props = $props();

	let fileInput: HTMLInputElement;

	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file && onUpload) {
			await onUpload(file);
		}
	}

	function triggerFileInput() {
		fileInput?.click();
	}
</script>

<div class="space-y-6">
	<!-- Upload Section -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">CSV Import/Export</h3>

		<div class="space-y-4">
			<!-- Download Template -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Step 1: Download Template
				</label>
				<button
					type="button"
					onclick={onDownloadTemplate}
					class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				>
					<span class="mr-2">📥</span>
					Download CSV Template
				</button>
				<p class="mt-2 text-sm text-gray-500">
					Download a pre-formatted CSV template with example data and column headers.
				</p>
			</div>

			<!-- Upload CSV -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Step 2: Upload Completed CSV
				</label>
				<div class="flex items-center space-x-4">
					<input
						type="file"
						accept=".csv"
						bind:this={fileInput}
						onchange={handleFileSelect}
						class="hidden"
					/>
					<button
						type="button"
						onclick={triggerFileInput}
						disabled={isUploading}
						class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span class="mr-2">📤</span>
						{isUploading ? 'Uploading...' : 'Upload CSV File'}
					</button>
				</div>
				<p class="mt-2 text-sm text-gray-500">
					Supported columns: NIK, FirstName, LastName, Email, OrgUnit, Position, EmploymentType, JoinDate, WorkLocation
				</p>
			</div>
		</div>
	</div>

	<!-- Preview Section -->
	{#if preview}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Import Preview</h3>

			<!-- Statistics -->
			<div class="mb-6">
				<SyncStatsCard
					total={preview.toCreate.length + preview.toUpdate.length}
					toCreate={preview.toCreate.length}
					toUpdate={preview.toUpdate.length}
					warnings={preview.warnings.length}
					errors={preview.errors.length}
				/>
			</div>

			<!-- Errors (if any) -->
			{#if preview.errors.length > 0}
				<div class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
					<h4 class="text-sm font-medium text-red-800 mb-2">
						❌ {preview.errors.length} Error{preview.errors.length > 1 ? 's' : ''} Found
					</h4>
					<ul class="list-disc list-inside text-sm text-red-700 space-y-1">
						{#each preview.errors.slice(0, 5) as error}
							<li>{error.error}</li>
						{/each}
						{#if preview.errors.length > 5}
							<li class="text-red-600">... and {preview.errors.length - 5} more errors</li>
						{/if}
					</ul>
					<p class="mt-2 text-sm text-red-600">
						Please fix these errors in your CSV file before proceeding.
					</p>
				</div>
			{/if}

			<!-- Warnings (if any) -->
			{#if preview.warnings.length > 0}
				<div class="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
					<h4 class="text-sm font-medium text-yellow-800 mb-2">
						⚠️ {preview.warnings.length} Warning{preview.warnings.length > 1 ? 's' : ''}
					</h4>
					<ul class="list-disc list-inside text-sm text-yellow-700 space-y-1">
						{#each preview.warnings.slice(0, 5) as warning}
							<li>{warning.warning}</li>
						{/each}
						{#if preview.warnings.length > 5}
							<li class="text-yellow-600">... and {preview.warnings.length - 5} more warnings</li>
						{/if}
					</ul>
				</div>
			{/if}

			<!-- New Identities Preview -->
			{#if preview.toCreate.length > 0}
				<div class="mb-6">
					<h4 class="text-sm font-medium text-gray-900 mb-3">
						➕ New Identities (will be created with isActive: true)
					</h4>
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NIK</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each preview.toCreate.slice(0, 10) as identity}
									<tr>
										<td class="px-4 py-2 text-sm text-gray-900">{identity.employeeId}</td>
										<td class="px-4 py-2 text-sm text-gray-900">{identity.fullName}</td>
										<td class="px-4 py-2 text-sm text-gray-900">{identity.email || '(NIK as username)'}</td>
										<td class="px-4 py-2 text-sm text-gray-500">{identity.employmentType}</td>
									</tr>
								{/each}
								{#if preview.toCreate.length > 10}
									<tr>
										<td colspan="4" class="px-4 py-2 text-sm text-gray-500 text-center">
											... and {preview.toCreate.length - 10} more
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
					<p class="mt-2 text-sm text-gray-600">
						→ These employees will receive welcome emails with temporary passwords
					</p>
					<p class="text-sm text-gray-600">
						→ They can login immediately after import
					</p>
				</div>
			{/if}

			<!-- Existing Identities Update Preview -->
			{#if preview.toUpdate.length > 0}
				<div class="mb-6">
					<h4 class="text-sm font-medium text-gray-900 mb-3">
						🔄 Existing Identities (will be updated, status preserved)
					</h4>
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NIK</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each preview.toUpdate.slice(0, 10) as update}
									<tr>
										<td class="px-4 py-2 text-sm text-gray-900">{update.identity.employeeId}</td>
										<td class="px-4 py-2 text-sm text-gray-900">{update.identity.fullName}</td>
										<td class="px-4 py-2 text-sm text-gray-500">
											{Object.keys(update.changes).join(', ')}
										</td>
										<td class="px-4 py-2 text-sm">
											<span class="px-2 py-1 text-xs font-semibold rounded-full {update.identity.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
												{update.identity.isActive ? 'Active' : 'Inactive'}
											</span>
										</td>
									</tr>
								{/each}
								{#if preview.toUpdate.length > 10}
									<tr>
										<td colspan="4" class="px-4 py-2 text-sm text-gray-500 text-center">
											... and {preview.toUpdate.length - 10} more
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
					<p class="mt-2 text-sm text-gray-600">
						→ Status and passwords will NOT be changed
					</p>
					<p class="text-sm text-gray-600">
						→ Only fields from CSV will be updated
					</p>
				</div>
			{/if}

			<!-- Apply Button -->
			{#if preview.errors.length === 0}
				<div class="flex justify-end space-x-4">
					<button
						type="button"
						onclick={() => (preview = null)}
						class="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={onApplyImport}
						disabled={isApplying}
						class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span class="mr-2">✅</span>
						{isApplying ? 'Applying...' : `Confirm Import (${preview.toCreate.length + preview.toUpdate.length} identities)`}
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Instructions -->
	<div class="bg-blue-50 border border-blue-200 rounded-md p-4">
		<h4 class="text-sm font-medium text-blue-800 mb-2">📝 CSV Import Instructions</h4>
		<ul class="list-disc list-inside text-sm text-blue-700 space-y-1">
			<li><strong>NIK is required</strong> - Unique employee identifier</li>
			<li><strong>Email is optional</strong> - If not provided, NIK will be used as username</li>
			<li><strong>New employees</strong> - Created with isActive: true (can login immediately)</li>
			<li><strong>Existing employees</strong> - Only updated fields from CSV, status preserved</li>
			<li><strong>Inactive employees</strong> - Simply exclude from CSV (don't import)</li>
			<li><strong>Safe re-imports</strong> - Can upload CSV monthly, status/passwords won't be reset</li>
		</ul>
	</div>
</div>
