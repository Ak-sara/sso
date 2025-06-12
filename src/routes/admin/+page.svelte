<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	export let form: ActionData;
</script>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold text-gray-900 mb-8">OIDC OAuth Server Admin</h1>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Create User -->
			<div class="bg-white p-6 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-4">Create User</h2>
				
				{#if form?.error}
					<div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
						{form.error}
					</div>
				{/if}

				{#if form?.success}
					<div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
						{form.success}
					</div>
				{/if}

				<form method="POST" action="?/createUser" use:enhance class="space-y-4">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700">Name</label>
						<input
							type="text"
							id="name"
							name="name"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
						<input
							type="password"
							id="password"
							name="password"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<button
						type="submit"
						class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						Create User
					</button>
				</form>
			</div>

			<!-- Create Client -->
			<div class="bg-white p-6 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-4">Create OAuth Client</h2>

				{#if form?.client}
					<div class="mb-4 p-4 bg-blue-100 border border-blue-400 rounded">
						<h3 class="font-semibold text-blue-800">Client Created Successfully!</h3>
						<div class="mt-2 text-sm text-blue-700">
							<p><strong>Client ID:</strong> {form.client.client_id}</p>
							<p><strong>Client Secret:</strong> {form.client.client_secret}</p>
							<p class="text-red-600 mt-2">⚠️ Save these credentials securely. The secret won't be shown again.</p>
						</div>
					</div>
				{/if}

				<form method="POST" action="?/createClient" use:enhance class="space-y-4">
					<div>
						<label for="client_name" class="block text-sm font-medium text-gray-700">Application Name</label>
						<input
							type="text"
							id="client_name"
							name="name"
							required
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="redirect_uris" class="block text-sm font-medium text-gray-700">
							Redirect URIs (one per line)
						</label>
						<textarea
							id="redirect_uris"
							name="redirect_uris"
							rows="3"
							required
							placeholder="http://localhost:3000/callback&#10;https://myapp.com/auth/callback"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						></textarea>
					</div>

					<div>
						<label for="allowed_scopes" class="block text-sm font-medium text-gray-700">
							Allowed Scopes (space-separated)
						</label>
						<input
							type="text"
							id="allowed_scopes"
							name="allowed_scopes"
							placeholder="openid email profile"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>

					<button
						type="submit"
						class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
					>
						Create Client
					</button>
				</form>
			</div>
		</div>

		<!-- Documentation -->
		<div class="mt-12 bg-white p-6 rounded-lg shadow">
			<h2 class="text-xl font-semibold mb-4">OAuth 2.0 / OIDC Endpoints</h2>
			
			<div class="space-y-4 text-sm">
				<div>
					<h3 class="font-medium text-gray-900">Discovery Endpoint</h3>
					<code class="block mt-1 p-2 bg-gray-100 rounded">GET /.well-known/openid_configuration</code>
				</div>

				<div>
					<h3 class="font-medium text-gray-900">Authorization Endpoint</h3>
					<code class="block mt-1 p-2 bg-gray-100 rounded">GET /oauth/authorize</code>
					<p class="mt-1 text-gray-600">Parameters: response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method</p>
				</div>

				<div>
					<h3 class="font-medium text-gray-900">Token Endpoint</h3>
					<code class="block mt-1 p-2 bg-gray-100 rounded">POST /oauth/token</code>
					<p class="mt-1 text-gray-600">Form data: grant_type, code, redirect_uri, client_id, client_secret, code_verifier</p>
				</div>

				<div>
					<h3 class="font-medium text-gray-900">UserInfo Endpoint</h3>
					<code class="block mt-1 p-2 bg-gray-100 rounded">GET /oauth/userinfo</code>
					<p class="mt-1 text-gray-600">Authorization: Bearer &lt;access_token&gt;</p>
				</div>
			</div>

			<div class="mt-6 p-4 bg-yellow-100 border border-yellow-400 rounded">
				<h3 class="font-medium text-yellow-800">Example Authorization Flow</h3>
				<ol class="mt-2 text-sm text-yellow-700 space-y-1">
					<li>1. Redirect user to: <code>/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=openid email</code></li>
					<li>2. User logs in and authorizes your application</li>
					<li>3. User is redirected back with authorization code</li>
					<li>4. Exchange code for tokens at <code>/oauth/token</code></li>
					<li>5. Use access token to call <code>/oauth/userinfo</code></li>
				</ol>
			</div>
		</div>
	</div>
</div>
