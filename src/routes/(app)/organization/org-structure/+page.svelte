<script lang="ts">
	import type { PageData } from './$types';
	import OrgVersionModal from './OrgVersionModal.svelte';
	import PageHints from '$lib/components/PageHints.svelte';

	let { data }: { data: PageData } = $props();

	let actVersion: any = $state(null);
	let showPageHints = $state(false);	
</script>

<PageHints bind:visible={showPageHints}
	title='Organization Structure Versioning'
	paragraph='<p class="mt-1 text-sm text-blue-700">
		Setiap perubahan struktur organisasi (penambahan/penghapusan unit, perubahan hierarki, atau mutasi karyawan)
		harus dibuat sebagai <strong>versi baru</strong> dengan <strong>Surat Keputusan (SK)</strong> resmi.
		Sistem akan otomatis mencatat perubahan dan menghasilkan daftar karyawan yang terdampak untuk dilampirkan ke SK.</p>' />

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h2 class="text-2xl font-bold text-gray-900">Versi Struktur Organisasi</h2>
			<p class="text-sm text-gray-500 mt-1">Kelola dan bandingkan versi struktur organisasi dari waktu ke waktu</p>
		</div>
		<div>
			<button class="px-2 py-0 text-2xl inline-block transition-transform duration-200 hover:-rotate-12 cursor-pointer"
				onclick={() => (showPageHints = true)} > ℹ️ </button>
			<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				onclick={() => (actVersion = {})} > + Make new Version</button>
		</div>
	</div>

	<!-- Current Active Version -->
	{#if data.currentVersion}
		<div class="bg-white shadow rounded-lg p-6 border-2 border-green-500">
			<div class="flex items-center justify-between mb-4">
				<div class="flex flex-col items-center justify-between">
					<div class="flex items-center space-x-3 mb-4">
						<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
						✓ AKTIF
						</span>
						<h3 class="text-lg font-medium">Version {data.currentVersion.versionNumber}: {data.currentVersion.versionName}</h3>
					</div>
					<div class="grid grid-cols-4 gap-4 text-sm">
						<div>
							<p class="text-gray-500">Tanggal Efektif</p>
							<p class="font-medium">{new Date(data.currentVersion.effectiveDate).toLocaleDateString('id-ID')}</p>
						</div>
						<div>
							<p class="text-gray-500">Unit Kerja</p>
							<p class="font-medium">{data.currentVersion.structure.orgUnits.length} units</p>
						</div>
						<div>
							<p class="text-gray-500">Nomor SK</p>
							<p class="font-medium">{data.currentVersion.skNumber || '-'}</p>
						</div>
						<div>
							<p class="text-gray-500">Karyawan Terdampak</p>
							<p class="font-medium">{data.currentVersion.reassignments.length} orang</p>
						</div>
					</div>	
				</div>
				<div class="flex items-center justify-center gap-2">
					<a href="/organization/org-structure/{data.currentVersion._id}/sto"
						class="px-3 py-1 text-sm border border-gray-300 rounded-md bg-green-100 hover:bg-yellow-100">View STO</a>
					
					<a href="/organization/org-structure/{data.currentVersion._id}"
						class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"> Lihat Detail → </a>
				</div>
				
			</div>
		</div>
	{/if}

	<!-- Version History -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<div class="px-6 py-4 border-b border-gray-200">
			<h3 class="text-lg font-medium">Riwayat Versi</h3>
		</div>

		<div class="divide-y divide-gray-200">
			{#each data.versions as version}
				<div class="p-6 hover:bg-gray-50">
					<div class="flex justify-between items-center space-x-3 mb-2">
						<div>
							<div>
								<span class="text-lg font-semibold">v{version.versionNumber}</span>
								<span class="text-gray-900">{version.versionName}</span>
							</div>
							{#if version.notes}
								<p class="text-sm text-gray-600 mt-2 italic">{version.notes}</p>
							{/if}
						</div>
						<div>
							{#if version.status === 'active'}
								<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
									AKTIF
								</span>
							{:else if version.status === 'draft'}
								<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
									DRAFT
								</span>
							{:else}
								<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
									ARCHIVED
								</span>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex-1 grid grid-cols-5 gap-4 text-sm">
							<div>
								<p class="text-gray-500">Efektif</p>
								<p class="font-medium">{new Date(version.effectiveDate).toLocaleDateString('id-ID')}</p>
							</div>
							{#if version.endDate}
								<div>
									<p class="text-gray-500">Berakhir</p>
									<p class="font-medium">{new Date(version.endDate).toLocaleDateString('id-ID')}</p>
								</div>
							{/if}
							<div>
								<p class="text-gray-500">SK Number</p>
								<p class="font-medium">{version.skNumber || '-'}</p>
							</div>
							<div>
								<p class="text-gray-500">Perubahan</p>
								<p class="font-medium">{version.changes.length} items</p>
							</div>
							<div>
								<p class="text-gray-500">Reassignments</p>
								<p class="font-medium">{version.reassignments.length} karyawan</p>
							</div>
						</div>
						
						<div class="flex space-x-2 ml-4">
							<a href="/organization/org-structure/{version._id}/sto"
								class="px-3 py-1 text-sm border border-gray-300 rounded-md bg-green-100 hover:bg-yellow-100">View STO</a>
							<a href="/organization/org-structure/{version._id}"
								class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Detail </a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

{#if actVersion}
	<OrgVersionModal bind:open={actVersion} />
{/if}
