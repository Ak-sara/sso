<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	export let data: PageData;
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
			{#if data.isLoggedIn}
				Authorize Application
			{:else}
				Sign in to your account
			{/if}
		</h2>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			{#if !data.isLoggedIn}
				<form method="POST" action="?/login" use:enhance class="space-y-6">
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700">
							Email address
						</label>
						<div class="mt-1">
							<input
								id="email"
								name="email"
								type="email"
								autocomplete="email"
								required
								class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							/>
						</div>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700">
							Password
						</label>
						<div class="mt-1">
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="current-password"
								required
								class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						>
							Sign in
						</button>
					</div>
				</form>
			{:else}
				<div class="space-y-6">
					<div class="text-center">
						<h3 class="text-lg font-medium text-gray-900">Hello, {data.user?.name}</h3>
						<p class="mt-2 text-sm text-gray-600">
							<strong>{data.client.name}</strong> is requesting access to your account.
						</p>
					</div>

					<div class="bg-gray-50 p-4 rounded-md">
						<h4 class="text-sm font-medium text-gray-900 mb-2">Requested permissions:</h4>
						<ul class="text-sm text-gray-600 space-y-1">
							{#each data.params.scope.split(' ') as scope}
								<li>• {scope}</li>
							{/each}
						</ul>
					</div>

					<form method="POST" action="?/authorize" use:enhance class="space-y-4">
						<button
							type="submit"
							class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
						>
							Authorize
						</button>
						
						<a
							href={data.params.redirect_uri}
							class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						>
							Cancel
						</a>
					</form>
				</div>
			{/if}
		</div>
	</div>
</div>

