<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Email Verification - Aksara SSO</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full">
		<div class="bg-white shadow-2xl rounded-2xl p-8">
			<!-- Logo/Header -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900">🔐 Aksara SSO</h1>
				<p class="mt-2 text-sm text-gray-600">Email Verification</p>
			</div>

			{#if data.status === 'success'}
				<!-- Success State -->
				<div class="text-center">
					<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
						<svg class="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">Verification Successful!</h2>
					<p class="text-gray-600 mb-6">{data.message}</p>

					<div class="space-y-3">
						<a
							href="/login"
							class="block w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
						>
							Sign In Now
						</a>
						<a
							href="/"
							class="block w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
						>
							Go to Home
						</a>
					</div>

					<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<p class="text-sm text-blue-800">
							<strong>✓ Your account is now active</strong><br>
							You can sign in and start using Aksara SSO
						</p>
					</div>
				</div>

			{:else}
				<!-- Error State -->
				<div class="text-center">
					<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
						<svg class="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
					<p class="text-gray-600 mb-6">{data.message}</p>

					<div class="space-y-3">
						<a
							href="/auth/resend-verification"
							class="block w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
						>
							Request New Verification Email
						</a>
						<a
							href="/login"
							class="block w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
						>
							Back to Sign In
						</a>
					</div>

					<div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
						<p class="text-sm text-yellow-800">
							<strong>Need Help?</strong><br>
							Contact your organization administrator if you continue to experience issues.
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
