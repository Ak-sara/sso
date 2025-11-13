<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	interface Props {
		form?: ActionData;
		data: PageData;
	}

	let { form, data }: Props = $props();
	let isLoading = $state(false);
</script>

<svelte:head>
	<title>Daftar Akun - Aksara SSO</title>
</svelte:head>

<div class="w-full max-w-2xl">
	<div class="bg-white rounded-2xl shadow-2xl p-8 lg:p-12">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Daftar Akun Baru</h1>
			<p class="text-gray-600">Buat akun untuk mengakses sistem organisasi Anda</p>
		</div>

		<!-- Registration Disabled Message -->
		{#if !data.isRegistrationEnabled}
			<div class="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
				<div class="flex items-start">
					<span class="text-yellow-600 mr-3 text-2xl">⚠️</span>
					<div>
						<p class="text-sm text-yellow-800 font-medium mb-2">
							Pendaftaran mandiri saat ini dinonaktifkan
						</p>
						<p class="text-sm text-yellow-700 mb-3">
							Untuk mendapatkan akses, silakan hubungi administrator atau supervisor Anda untuk proses onboarding.
						</p>
						<a href="/login" class="inline-block text-sm text-yellow-600 hover:text-yellow-800 underline font-medium">
							← Kembali ke halaman login
						</a>
					</div>
				</div>
			</div>
		{:else if form?.success}
			<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
				<div class="flex items-start">
					<span class="text-green-500 mr-2 text-xl">✅</span>
					<div>
						<p class="text-sm text-green-700 font-medium mb-2">{form.message}</p>
						<a href="/login" class="text-sm text-green-600 hover:text-green-800 underline">
							← Kembali ke halaman login
						</a>
					</div>
				</div>
			</div>
		{:else}
			<!-- Error Message -->
			{#if form?.error}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div class="flex items-start">
						<span class="text-red-500 mr-2">⚠️</span>
						<p class="text-sm text-red-700">{form.error}</p>
					</div>
				</div>
			{/if}

			<!-- Registration Form -->
			<form
				method="POST"
				use:enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						await update();
						isLoading = false;
					};
				}}
			>
				<!-- Realm Selection -->
				<div class="mb-4">
					<label for="realmCode" class="block text-sm font-medium text-gray-700 mb-2">
						Organisasi <span class="text-red-500">*</span>
					</label>
					<select
						id="realmCode"
						name="realmCode"
						value={form?.realmCode ?? ''}
						required
						disabled={isLoading}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
					>
						<option value="">-- Pilih Organisasi --</option>
						{#each data.realms as realm}
							<option value={realm.code}>{realm.name}</option>
						{/each}
					</select>
					<p class="mt-1 text-xs text-gray-500">Pilih organisasi tempat Anda bekerja</p>
				</div>

				<!-- Email -->
				<div class="mb-4">
					<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
						Email <span class="text-red-500">*</span>
					</label>
					<input
						type="email"
						id="email"
						name="email"
						value={form?.email ?? ''}
						required
						disabled={isLoading}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
						placeholder="nama@perusahaan.com"
						autocomplete="email"
					/>
					<p class="mt-1 text-xs text-gray-500">
						Gunakan email perusahaan Anda. Domain email harus sesuai dengan organisasi yang dipilih.
					</p>
				</div>

				<!-- First Name & Last Name -->
				<div class="grid grid-cols-2 gap-4 mb-4">
					<div>
						<label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
							Nama Depan <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							id="firstName"
							name="firstName"
							value={form?.firstName ?? ''}
							required
							disabled={isLoading}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="John"
							autocomplete="given-name"
						/>
					</div>
					<div>
						<label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
							Nama Belakang <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							id="lastName"
							name="lastName"
							value={form?.lastName ?? ''}
							required
							disabled={isLoading}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="Doe"
							autocomplete="family-name"
						/>
					</div>
				</div>

				<!-- Password -->
				<div class="mb-4">
					<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
						Password <span class="text-red-500">*</span>
					</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						disabled={isLoading}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
						placeholder="••••••••"
						autocomplete="new-password"
					/>
					<p class="mt-1 text-xs text-gray-500">Minimal 8 karakter</p>
				</div>

				<!-- Confirm Password -->
				<div class="mb-6">
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Konfirmasi Password <span class="text-red-500">*</span>
					</label>
					<input
						type="password"
						id="confirmPassword"
						name="confirmPassword"
						required
						disabled={isLoading}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
						placeholder="••••••••"
						autocomplete="new-password"
					/>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isLoading}
					class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
				>
					{#if isLoading}
						<span class="inline-block animate-spin mr-2">⏳</span>
						Memproses...
					{:else}
						Daftar
					{/if}
				</button>
			</form>
		{/if}

		<!-- Footer -->
		<div class="mt-8 text-center text-sm text-gray-600">
			<p>
				Sudah punya akun?
				<a href="/login" class="text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
					Login di sini
				</a>
			</p>
		</div>
	</div>
</div>
