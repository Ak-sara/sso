<script lang="ts">
	interface Props {
		position: any;
		onSave: () => void;
	}

	let { position = $bindable(), onSave }: Props = $props();
</script>

<!-- Content -->
<div class="p-6 space-y-4">
	<div class="grid grid-cols-4 gap-4" >
		<!-- Code -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Kode</label>
			{#if position._id}
				<p class="px-3 py-2 bg-gray-100 rounded-md text-gray-600">{position.code}</p>
				<p class="text-xs text-gray-500 mt-1">Kode tidak dapat diubah</p>
			{:else}
				<input type="text" bind:value={position.code} class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="MGR" required />
			{/if}
		</div>
		<!-- Grade -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Grade</label>
			<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				type="text" bind:value={position.grade} />
		</div>

		<!-- Level -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
			<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
				type="number" bind:value={position.level} min="0" max="10" />
		</div>

		<!-- Active Status -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
			<label class="flex items-center gap-2">
				<input class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
					type="checkbox" bind:checked={position.isActive} />
				<span class="text-sm font-medium text-gray-700"> Active</span>
			</label>
		</div>
	</div>
	
	<!-- Name -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Nama Posisi</label>
		<input class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
			type="text" bind:value={position.name} />
	</div>

	<!-- Description -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
		<textarea class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
			bind:value={position.description} rows="3"></textarea>
	</div>

</div>

<!-- Footer -->
<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
	<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		onclick={onSave} >
		{position._id ? 'Save Changes' : 'Buat Posisi'}
	</button>
</div>
