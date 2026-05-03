<script lang="ts">
	import FormModal from '$lib/components/FormModal.svelte';

	interface Props { open?: any; }
	let { open = $bindable() }: Props = $props();
</script>

<FormModal
	onClose={() => (open = null)}
	title="Create New Structure Version"
	subtitle="A new version will be created based on the current structure">
	<div class="p-6">
		<p class="text-sm text-gray-600 mb-6">
			You can edit the structure and add decree information after the version is created.
		</p>
		<form method="POST" action="?/create" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Version Name *</label>
				<input type="text" name="versionName" required
					placeholder="e.g. 2025-Q2 Restructure Cargo Division"
					class="w-full px-3 py-2 border rounded-md" />
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Effective Date *</label>
				<input type="date" name="effectiveDate" required class="w-full px-3 py-2 border rounded-md" />
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
				<textarea name="notes" rows="3"
					placeholder="Reason for new version, planned changes, etc."
					class="w-full px-3 py-2 border rounded-md"></textarea>
			</div>
			<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<button type="button" onclick={() => (open = null)}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
					Cancel
				</button>
				<button type="submit"
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
					Create Draft Version
				</button>
			</div>
		</form>
	</div>
</FormModal>
