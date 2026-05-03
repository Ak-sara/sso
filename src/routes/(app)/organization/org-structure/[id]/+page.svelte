<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import FormModal from '$lib/components/FormModal.svelte';
	import Input from '$lib/components/Input.svelte';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('structure');
	let showApproveModal = $state(false);
	let showCreateSKModal = $state(false);

	// date state for Input components
	let skDate = $state(data.version?.skDate ? new Date(data.version.skDate).toISOString().split('T')[0] : '');
	let createSkDate = $state('');
	let createEffectiveDate = $state('');

	// Build parent code lookup map once
	const idToCode: Record<string, string> = {};
	for (const u of data.version.structure.orgUnits) {
		idToCode[u._id] = u.code;
	}

	const structureColumns = [
		{
			key: 'code',
			label: 'Code',
			sortable: true,
			render: (value: string) => `<code class="bg-gray-100 px-2 py-1 rounded text-xs">${value}</code>`
		},
		{ key: 'name', label: 'Nama', sortable: true },
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			render: (value: string) => {
				const cls = value === 'directorate' ? 'bg-purple-100 text-purple-800' : value === 'division' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
				return `<span class="px-2 py-1 text-xs rounded ${cls}">${value}</span>`;
			}
		},
		{
			key: 'parentId',
			label: 'Parent',
			sortable: false,
			render: (value: string) => idToCode[value] || '-'
		},
		{ key: 'level', label: 'Level', sortable: true },
		{
			key: 'headEmployeeId',
			label: 'Kepala Unit',
			sortable: false,
			render: (value: string) => value || '-'
		}
	];

	const reassignmentColumns = [
		{ key: 'employeeId', label: 'NIK', sortable: true },
		{ key: 'employeeName', label: 'Nama', sortable: true },
		{
			key: 'previousOrgUnitName',
			label: 'Dari',
			sortable: true,
			render: (value: string) => `<span class="text-xs">${value || '-'}</span>`
		},
		{
			key: 'newOrgUnitName',
			label: 'Ke',
			sortable: true,
			render: (value: string) => `<span class="text-xs font-medium">${value || '-'}</span>`
		},
		{
			key: 'skNumber',
			label: 'SK Penempatan',
			sortable: true,
			render: (value: string, row: any) => `<a href="/organization/sk-penempatan/${row.skPenempatanId}" class="text-indigo-600 hover:underline">${value}</a>`
		}
	];
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center space-x-3">
				<a href="/organization/org-structure" class="text-gray-500 hover:text-gray-700">
					← Kembali
				</a>
				<h2 class="text-2xl font-bold">
					Version {data.version.versionNumber}: {data.version.versionName}
				</h2>
				{#if data.version.status === 'active'}
					<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
						✓ AKTIF
					</span>
				{:else if data.version.status === 'draft'}
					<span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
						DRAFT
					</span>
				{:else if data.version.status === 'archived'}
					<span class="px-3 py-1 bg-gray-400 text-white text-sm font-semibold rounded-full">
						ARSIP
					</span>
				{/if}
			</div>
			<p class="text-sm text-gray-500 mt-1">
				Efektif: {new Date(data.version.effectiveDate).toLocaleDateString('id-ID')}
				{#if data.version.skNumber}
					• SK: {data.version.skNumber}
				{/if}
			</p>
		</div>

		<div class="flex space-x-2">
			<a href="/org-structure/{data.version._id}/sto"
				class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300">
				📊 View STO
			</a>
			{#if data.version.status === 'draft'}
				<!-- NEW: Simple publish button -->
				<form method="POST" action="?/publish" class="inline">
					<button type="submit"
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700" >
						🚀 Publish & Activate
					</button>
				</form>
			{:else if data.version.publishStatus === 'failed'}
				<!-- Resume failed publish -->
				<form method="POST" action="?/resumePublish" class="inline">
					<button type="submit"
						class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700" >
						🔄 Resume Publish
					</button>
				</form>
			{/if}
		</div>
		
	</div>
			
	<form method="POST" action="?/updateSK" class="space-y-4">
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Decree No. *</label>
				<input
					type="text"
					name="skNumber"
					value={data.version.skNumber || ''}
					placeholder="SK-001/IAS/2025"
					class="w-full px-3 py-2 border rounded-md"
				/>
			</div>
			<div>
				<Input type="date" name="skDate" label="Decree Date *" bind:value={skDate} />
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Signed By</label>
				<select name="skSignedBy" class="w-full px-3 py-2 border rounded-md">
					<option value="">Select signatory...</option>
					{#each data.directors as director}
						<option value={director.employeeId} selected={data.version.skSignedBy === director.employeeId}>
							{director.fullName} - {director.positionName}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Upload Decree Document</label>
				<input
					type="file"
					accept=".pdf,.docx"
					class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
				/>
				<p class="text-xs text-gray-500 mt-1">Format: PDF or DOCX, max 10MB</p>
			</div>
		</div>

		{#if data.version.skAttachments && data.version.skAttachments.length > 0}
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
				<ul class="space-y-2">
					{#each data.version.skAttachments as attachment}
						<li class="flex items-center justify-between p-2 bg-gray-50 rounded">
							<div class="flex items-center space-x-2">
								<span class="text-sm">📄</span>
								<span class="text-sm">{attachment.filename}</span>
								<span class="text-xs text-gray-500">
									({new Date(attachment.uploadedAt).toLocaleDateString('id-ID')})
								</span>
							</div>
							<button class="text-red-600 hover:text-red-800 text-sm">Delete</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex justify-end">
			<button type="submit"
				class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" >
				Save Decree Info
			</button>
		</div>
	</form>
			
	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				onclick={() => activeTab = 'structure'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'structure' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				📊 Org Structure
			</button>
			<button
				onclick={() => activeTab = 'changes'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'changes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				🔄 Changes ({data.version.changes.length})
			</button>
			<button
				onclick={() => activeTab = 'sk-penempatan'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'sk-penempatan' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				👥 Placement Decrees ({data.linkedSKPenempatan?.length || 0})
			</button>
			<button
				onclick={() => activeTab = 'reassignments'}
				class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'reassignments' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				📊 Total Affected ({data.totalAffectedEmployees || 0})
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'structure'}
		<DataTable
			data={data.version.structure.orgUnits}
			columns={structureColumns}
			searchable={true}
			searchPlaceholder="Search work unit (name, code)..."
			searchKeys={['name', 'code', 'type']}
			emptyMessage="Tidak ada unit kerja dalam versi ini."
		/>

	{:else if activeTab === 'changes'}
		<div class="bg-white shadow rounded-lg p-6">
			<h3 class="text-lg font-medium mb-4">Change List</h3>

			{#if data.version.changes.length === 0}
				<p class="text-gray-500">No changes from previous version.</p>
			{:else}
				<div class="space-y-4">
					{#each data.version.changes as change}
						<div class="border-l-4 {change.type.includes('added') ? 'border-green-500' : change.type.includes('removed') ? 'border-red-500' : 'border-blue-500'} pl-4 py-2">
							<div class="flex items-start justify-between">
								<div>
									<p class="font-medium">
										{#if change.type === 'unit_added'}🟢 Unit Added
										{:else if change.type === 'unit_removed'}🔴 Unit Removed
										{:else if change.type === 'unit_renamed'}🔵 Unit Renamed
										{:else if change.type === 'unit_moved'}🔵 Unit Moved
										{:else if change.type === 'unit_merged'}🔵 Unit Merged
										{:else}{change.type}{/if}
									</p>
									<p class="text-sm text-gray-600">{change.description}</p>
									{#if change.oldValue}
										<p class="text-xs text-gray-500 mt-1">
											Lama: <code class="bg-gray-100 px-1 rounded">{JSON.stringify(change.oldValue)}</code>
										</p>
									{/if}
									{#if change.newValue}
										<p class="text-xs text-gray-500">
											Baru: <code class="bg-gray-100 px-1 rounded">{JSON.stringify(change.newValue)}</code>
										</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	{:else if activeTab === 'sk-penempatan'}
		<!-- SK Penempatan Karyawan (Detail/Children) -->
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h3 class="text-lg font-medium">👥 Placement Decrees</h3>
					<p class="text-sm text-gray-600 mt-1">
						List of placement decrees issued for employees affected by this structure change.
					</p>
				</div>
				<button
					type="button"
					onclick={() => showCreateSKModal = true}
					class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
				>
					<span>+</span>
					<span>Create New Placement Decree</span>
				</button>
			</div>

			{#if data.linkedSKPenempatan && data.linkedSKPenempatan.length > 0}
				<div class="space-y-3">
					{#each data.linkedSKPenempatan as sk}
						<a
							href="/organization/sk-penempatan/{sk._id}"
							class="block p-5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center space-x-3 mb-2">
										<p class="font-semibold text-gray-900">{sk.skNumber}</p>
										{#if sk.status === 'draft'}
											<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
												DRAFT
											</span>
										{:else if sk.status === 'pending_approval'}
											<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
												PENDING
											</span>
										{:else if sk.status === 'approved'}
											<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
												APPROVED
											</span>
										{:else if sk.status === 'executed'}
											<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
												EXECUTED
											</span>
										{/if}
									</div>
									<p class="text-sm text-gray-600 mb-1">{sk.skTitle || sk.description}</p>
									<div class="flex items-center space-x-4 text-xs text-gray-500">
										<span>📅 {new Date(sk.skDate).toLocaleDateString('id-ID')}</span>
										<span>•</span>
										<span>Effective: {new Date(sk.effectiveDate).toLocaleDateString('id-ID')}</span>
										<span>•</span>
										<span class="font-medium text-indigo-600">{sk.totalReassignments} employees</span>
									</div>
								</div>
								<div class="text-gray-400">
									→
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="border border-gray-200 rounded-lg p-12 text-center">
					<div class="text-gray-400 text-5xl mb-4">📋</div>
					<p class="text-gray-600 font-medium mb-2">No Placement Decrees yet</p>
					<p class="text-sm text-gray-500">
						Click "Create New Placement Decree" to create an employee placement decree.
					</p>
				</div>
			{/if}
		</div>

	{:else if activeTab === 'reassignments'}
		<DataTable
			data={data.aggregatedReassignments || []}
			columns={reassignmentColumns}
			header_before="<p class='text-sm text-gray-500'>Aggregated list of all employees affected across all Placement Decrees</p>"
			searchable={true}
			searchPlaceholder="Search employee (ID, name)..."
			searchKeys={['employeeId', 'employeeName', 'skNumber']}
			emptyMessage="No affected employees. Create a Placement Decree first."
		/>
	{/if}
</div>

{#if showApproveModal}
	<FormModal
		onClose={() => showApproveModal = false}
		title="Submit for Approval"
		subtitle="This version will be submitted for approval">

		<div class="p-6 space-y-6">
			<p class="text-sm text-gray-600">
				Are you sure you want to submit this version for approval? Once submitted, the version can no longer be edited.
			</p>

			<div class="bg-yellow-50 border border-yellow-200 rounded p-4">
				<p class="text-sm text-yellow-800">
					⚠️ Please ensure:<br>
					• All changes are correct<br>
					• Decree information is complete<br>
					• The list of affected employees is accurate
				</p>
			</div>

			<form method="POST" action="?/submitApproval" class="flex justify-end">
				<button
					type="submit"
					class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
				>
					Submit for Approval
				</button>
			</form>
		</div>

	</FormModal>
{/if}

{#if showCreateSKModal}
	<FormModal
		onClose={() => showCreateSKModal = false}
		title="Create New Placement Decree"
		subtitle="Placement decree linked to this structure version">

		<div class="p-6">
			<form method="POST" action="?/createSKPenempatan" class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Decree No. *</label>
						<input
							type="text"
							name="skNumber"
							placeholder="SK-PENEMPATAN-001/IAS/2025"
							required
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>
					<div>
						<Input type="date" name="skDate" label="Decree Date *" bind:value={createSkDate} />
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Decree Title</label>
					<input
						type="text"
						name="skTitle"
						placeholder="Employee Placement Batch 1"
						class="w-full px-3 py-2 border rounded-md"
					/>
				</div>

				<div>
					<Input type="date" name="effectiveDate" label="Effective Date *" bind:value={createEffectiveDate} />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Signed By *</label>
					<select name="signedBy" required class="w-full px-3 py-2 border rounded-md">
						<option value="">Select signatory...</option>
						{#each data.directors as director}
							<option value={director.employeeId}>
								{director.fullName} - {director.positionName}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
					<textarea
						name="description"
						rows="3"
						placeholder="Placement decree description..."
						class="w-full px-3 py-2 border rounded-md"
					></textarea>
				</div>

				<div class="bg-blue-50 border border-blue-200 rounded p-4">
					<p class="text-sm text-blue-800">
						💡 After the decree is created, you can add affected employees via:
						<br>• CSV import
						<br>• Manual entry
					</p>
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Create Decree
					</button>
				</div>
			</form>
		</div>

	</FormModal>
{/if}
