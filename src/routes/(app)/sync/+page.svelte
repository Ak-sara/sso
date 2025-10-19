<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CSVSyncTab from '$lib/components/CSVSyncTab.svelte';
	import EntraIDSyncTab from '$lib/components/EntraIDSyncTab.svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	const tabs = [
		{ id: 'csv', name: 'CSV Import/Export', icon: '📄', description: 'Bulk import from CSV files' },
		{ id: 'entra', name: 'Entra ID Sync', icon: '☁️', description: 'Sync with Microsoft Entra ID' },
		{ id: 'api', name: 'API Sync', icon: '🔌', description: 'API-based sync (coming soon)' }
	];

	let currentTab = $derived(data.currentTab || 'csv');
	let isUploading = $state(false);
	let isApplying = $state(false);
	let preview = $state<any>(null);

	// Handle form result
	$effect(() => {
		if (form?.success && form?.preview) {
			preview = form.preview;
			isUploading = false;
		}
		if (form?.success && form?.stats) {
			preview = null;
			isApplying = false;
			alert(form.message);
		}
	});

	function switchTab(tabId: string) {
		goto(`?tab=${tabId}`);
		preview = null; // Clear preview when switching tabs
	}

	async function handleUpload(file: File) {
		isUploading = true;
		const formData = new FormData();
		formData.append('file', file);

		// Submit form programmatically
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/uploadCSV';
		form.enctype = 'multipart/form-data';

		const input = document.createElement('input');
		input.type = 'file';
		input.name = 'file';
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);
		input.files = dataTransfer.files;

		form.appendChild(input);
		document.body.appendChild(form);
		form.requestSubmit();
		document.body.removeChild(form);
	}

	function handleDownloadTemplate() {
		// Generate CSV template
		const template = [
			'NIK,FirstName,LastName,Email,OrgUnit,Position,EmploymentType,JoinDate,WorkLocation',
			'IAS00001,John,Doe,john.doe@ias.co.id,IT-DEV,Software Engineer,permanent,2024-01-15,CGK',
			'IAS00002,Jane,Smith,,HR-REC,Recruiter,pkwt,2024-02-01,DPS',
		].join('\n');

		const blob = new Blob([template], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'employee-import-template.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleApplyImport() {
		if (!preview) return;

		isApplying = true;
		const formData = new FormData();
		formData.append('previewData', JSON.stringify(preview));

		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/applyImport';

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'previewData';
		input.value = JSON.stringify(preview);
		form.appendChild(input);

		document.body.appendChild(form);
		form.requestSubmit();
		document.body.removeChild(form);
	}
</script>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Sync & Import</h1>
		<p class="mt-1 text-sm text-gray-500">
			Import employee data from CSV or sync with external systems like Microsoft Entra ID
		</p>
	</div>

	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Smart Import with Status Preservation</h3>
				<div class="mt-2 text-sm text-blue-700">
					<ul class="list-disc list-inside space-y-1">
						<li><strong>New employees</strong>: Created with isActive: true (can login immediately)</li>
						<li><strong>Existing employees</strong>: Only updated fields from source, status/passwords preserved</li>
						<li><strong>NIK is unique identifier</strong>: Can be used as username if no email</li>
						<li><strong>Inactive employees</strong>: Simply exclude from import source (don't sync)</li>
					</ul>
				</div>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="bg-white shadow rounded-lg">
		<div class="border-b border-gray-200">
			<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
				{#each tabs as tab}
					<button
						type="button"
						onclick={() => switchTab(tab.id)}
						disabled={tab.id === 'api'}
						class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {currentTab === tab.id
							? 'border-indigo-500 text-indigo-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} {tab.id === 'api' ? 'opacity-50 cursor-not-allowed' : ''}"
					>
						<span class="mr-2">{tab.icon}</span>
						{tab.name}
						{#if tab.id === 'api'}
							<span class="ml-2 text-xs">(Soon)</span>
						{/if}
					</button>
				{/each}
			</nav>
		</div>

		<!-- Tab Content -->
		<div class="p-6">
			{#if currentTab === 'csv'}
				<CSVSyncTab
					{preview}
					{isUploading}
					{isApplying}
					onUpload={handleUpload}
					onDownloadTemplate={handleDownloadTemplate}
					onApplyImport={handleApplyImport}
				/>
			{:else if currentTab === 'entra'}
				<EntraIDSyncTab
					config={null}
					syncHistory={[]}
					isTesting={false}
					isSyncing={false}
					onTestConnection={async () => {
						alert('Entra ID connection test - Feature coming soon!');
					}}
					onSync={async () => {
						alert('Entra ID sync - Feature coming soon!');
					}}
					onSaveConfig={async (config) => {
						alert('Save Entra ID config - Feature coming soon!');
					}}
				/>
			{:else if currentTab === 'api'}
				<div class="text-center py-12">
					<span class="text-6xl mb-4 block">🔌</span>
					<h3 class="text-lg font-medium text-gray-900 mb-2">API Sync</h3>
					<p class="text-gray-500">
						REST API-based synchronization will be available soon.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
