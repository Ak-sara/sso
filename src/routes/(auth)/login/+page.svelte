<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	interface Props {
		form?: ActionData;
	}

	let { form }: Props = $props();

	let isLoading = $state(false);
</script>

<svelte:head>
	<title>Login - Aksara SSO</title>
</svelte:head>

<div class="w-full max-w-md">
	<div class="bg-white rounded-2xl shadow-2xl p-8">
		<!-- Logo & Title -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
				<span class="text-3xl">🔐</span>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Aksara SSO</h1>
			<p class="text-gray-600">Masuk ke akun Anda</p>
		</div>

		<!-- Error Message -->
		{#if form?.error}
			<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
				<div class="flex items-start">
					<span class="text-red-500 mr-2">⚠️</span>
					<p class="text-sm text-red-700">{form.error}</p>
				</div>
			</div>
		{/if}

		<!-- Login Form -->
		<form method="POST" use:enhance={() => {
			isLoading = true;
			return async ({ update }) => {
				await update();
				isLoading = false;
			};
		}}>
			<!-- Email Field -->
			<div class="mb-4">
				<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
					Email
				</label>
				<input
					type="email"
					id="email"
					name="email"
					value={form?.email ?? ''}
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
					placeholder="nama@perusahaan.com"
				/>
			</div>

			<!-- Password Field -->
			<div class="mb-6">
				<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
					Password
				</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					disabled={isLoading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
					placeholder="••••••••"
				/>
			</div>

			<!-- Remember Me & Forgot Password -->
			<div class="flex items-center justify-between mb-6">
				<label class="flex items-center">
					<input
						type="checkbox"
						name="remember"
						disabled={isLoading}
						class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:cursor-not-allowed"
					/>
					<span class="ml-2 text-sm text-gray-600">Ingat saya</span>
				</label>
				<a href="/forgot-password" class="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
					Lupa password?
				</a>
			</div>

			<!-- Submit Button -->
			<button
				type="submit"
				disabled={isLoading}
				class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center"
			>
				{#if isLoading}
					<span class="inline-block animate-spin mr-2">⏳</span>
					Memproses...
				{:else}
					Masuk
				{/if}
			</button>
		</form>

		<!-- Divider -->
		<div class="relative my-6">
			<div class="absolute inset-0 flex items-center">
				<div class="w-full border-t border-gray-300"></div>
			</div>
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-white text-gray-500">atau</span>
			</div>
		</div>

		<!-- Social Login (Future) -->
		<div class="space-y-3">
			<button
				type="button"
				disabled
				class="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="mr-2">🔗</span>
				Masuk dengan Microsoft
			</button>
			<button
				type="button"
				disabled
				class="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="mr-2">G</span>
				Masuk dengan Google
			</button>
		</div>

		<!-- Footer -->
		<div class="mt-8 text-center text-sm text-gray-600">
			<p>Belum punya akun? <a href="/register" class="text-indigo-600 hover:text-indigo-700 font-medium">Daftar sekarang</a></p>
		</div>
	</div>

	<!-- Test Credentials Info -->
	<div class="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg text-white text-sm">
		<p class="font-medium mb-2">🧪 Test Credentials:</p>
		<p>Email: admin@ias.co.id</p>
		<p>Password: password123</p>
	</div>
</div>
