<script lang="ts">
import FormModal from '$lib/components/FormModal.svelte';
import { formEnhance } from '$lib/utils/form-enhance';
import ShowPass from '$lib/components/ShowPass.svelte';

interface Props { form?: any; }
let { form = $bindable() }: Props = $props();

let isLoading = $state(false);
let showPassword=$state(false);
</script>

<FormModal wide onClose={() => { form = null; }} title={'Change Password'}
	subtitle="Pastikan password baru Anda kuat dan aman">

	<!-- Form Content -->
	<div class="grid p-2 gap-4">

		<!-- Password Requirements Info -->
		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
			<p class="text-sm font-medium text-blue-900 mb-2">Persyaratan Password:</p>
			<ul class="text-sm text-blue-700 space-y-1 ml-4">
				<li>• Minimal 8 karakter</li>
				<li>• Mengandung huruf besar (A-Z)</li>
				<li>• Mengandung huruf kecil (a-z)</li>
				<li>• Mengandung angka (0-9)</li>
			</ul>
		</div>

		<!-- Change Password Form -->
		<form method="POST" action="?/defPass" use:formEnhance={{
			onSubmit: () => { isLoading = true; },
			success: 'Password is updated, try to re-login',
			onSuccess: () => { form = null; },
			onDone: () => { isLoading = false; }
		}}>
			<div class="space-y-4">
				<!-- Current Password -->
				<div>
					<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Password Saat Ini
					</label>
					<div class="relative">
						<input class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
							type={showPassword ?"text":"password"}  id="currentPassword" name="currentPassword"
							placeholder="••••••••" disabled={isLoading} required />
						<ShowPass bind:showpass={showPassword}/>
					</div>
				</div>

				<!-- New Password -->
				<div>
					<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Password Baru
					</label>
					<div class="relative">
						<input class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
							type={showPassword ?"text":"password"}  id="newPassword" name="newPassword"
							placeholder="••••••••" disabled={isLoading} required />
						<ShowPass bind:showpass={showPassword}/>
					</div>
				</div>

				<!-- Confirm New Password -->
				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Konfirmasi Password Baru
					</label>
					<div class="relative">
						<input class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
							type={showPassword ?"text":"password"} id="confirmPassword" name="confirmPassword"
							placeholder="••••••••" disabled={isLoading} required />
						<ShowPass bind:showpass={showPassword} />
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-3 mt-6 pt-6 border-t border-gray-200">
				<button class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center"
					type="submit" disabled={isLoading} >
					{#if isLoading}
						<span class="inline-block animate-spin mr-2">⏳</span>
						Wait...
					{:else}
						Change Password
					{/if}
				</button>
			</div>
		</form>
	</div>

</FormModal>