<script lang="ts">
	interface Props {
		show: boolean;
		employeeName: string;
		allUsers: any[];
		onClose: () => void;
	}

	let { show, employeeName, allUsers, onClose }: Props = $props();
	let selectedUserId = $state('');
</script>

{#if show}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex items-center justify-center min-h-screen px-4">
			<button onclick={onClose} type="button" class="fixed inset-0 bg-black bg-opacity-50"></button>

			<div class="relative bg-white rounded-lg shadow-xl max-w-xl w-full p-6 z-10">
				<h3 class="text-lg font-medium text-gray-900 mb-4">🔗 Link Existing SSO User</h3>
				<p class="text-sm text-gray-600 mb-6">
					Link karyawan <strong>{employeeName}</strong> dengan akun SSO yang sudah ada.
				</p>

				<form method="POST" action="?/linkUser" class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Pilih User</label>
						<select
							name="userId"
							bind:value={selectedUserId}
							required
							class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
						>
							<option value="">-- Pilih User --</option>
							{#each allUsers as user}
								<option value={user._id}>
									{user.email} ({user.username}) - {user.roles?.join(', ') || 'user'}
								</option>
							{/each}
						</select>
						<p class="mt-1 text-xs text-gray-500">
							User yang dipilih akan terhubung dengan karyawan ini
						</p>
					</div>

					<div class="flex gap-3 justify-end">
						<button
							type="button"
							onclick={onClose}
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
							disabled={!selectedUserId}
						>
							🔗 Link User
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
