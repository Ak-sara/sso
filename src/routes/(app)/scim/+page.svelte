<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang SCIM (System for Cross-domain Identity Management)</h3>
				<p class="mt-1 text-sm text-blue-700">
					SCIM adalah protokol standar untuk otomasi provisioning pengguna. Dengan SCIM, aplikasi lain
					dapat secara otomatis membuat, memperbarui, atau menghapus pengguna di sistem SSO ini.
					SCIM 2.0 menyediakan REST API dengan endpoint <code class="bg-blue-100 px-1 rounded">/scim/v2/Users</code>
					dan <code class="bg-blue-100 px-1 rounded">/scim/v2/Groups</code>.
				</p>
			</div>
		</div>
	</div>

	<!-- SCIM Endpoints -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">SCIM 2.0 Endpoints</h3>

		<div class="space-y-4">
			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center space-x-2">
							<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">GET</span>
							<code class="text-sm">/scim/v2/ServiceProviderConfig</code>
						</div>
						<p class="text-sm text-gray-600 mt-2">Mendapatkan konfigurasi SCIM provider</p>
					</div>
					<button class="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900">Test</button>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center space-x-2">
							<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">GET</span>
							<code class="text-sm">/scim/v2/Users</code>
						</div>
						<p class="text-sm text-gray-600 mt-2">Mendapatkan daftar pengguna (dengan filter & pagination)</p>
					</div>
					<button class="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900">Test</button>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center space-x-2">
							<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">POST</span>
							<code class="text-sm">/scim/v2/Users</code>
						</div>
						<p class="text-sm text-gray-600 mt-2">Membuat pengguna baru via SCIM</p>
					</div>
					<button class="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900">Test</button>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center space-x-2">
							<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">PUT</span>
							<code class="text-sm">/scim/v2/Users/:id</code>
						</div>
						<p class="text-sm text-gray-600 mt-2">Update data pengguna</p>
					</div>
					<button class="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900">Test</button>
				</div>
			</div>

			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center space-x-2">
							<span class="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">DELETE</span>
							<code class="text-sm">/scim/v2/Users/:id</code>
						</div>
						<p class="text-sm text-gray-600 mt-2">Hapus pengguna</p>
					</div>
					<button class="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900">Test</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Authentication -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Authentication</h3>

		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Bearer Token</label>
				<div class="flex space-x-2">
					<input
						type="text"
						readonly
						value="scim_token_xxxxxxxxxxxxxxxxx"
						class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
					/>
					<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
						Generate New
					</button>
				</div>
				<p class="text-xs text-gray-500 mt-1">Token ini digunakan untuk autentikasi SCIM requests</p>
			</div>
		</div>
	</div>

	<!-- Status -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Status & Statistics</h3>

		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="border border-gray-200 rounded-lg p-4 text-center">
				<p class="text-2xl font-bold text-indigo-600">0</p>
				<p class="text-sm text-gray-500 mt-1">SCIM Requests (24h)</p>
			</div>
			<div class="border border-gray-200 rounded-lg p-4 text-center">
				<p class="text-2xl font-bold text-green-600">0</p>
				<p class="text-sm text-gray-500 mt-1">Success</p>
			</div>
			<div class="border border-gray-200 rounded-lg p-4 text-center">
				<p class="text-2xl font-bold text-red-600">0</p>
				<p class="text-sm text-gray-500 mt-1">Errors</p>
			</div>
			<div class="border border-gray-200 rounded-lg p-4 text-center">
				<p class="text-2xl font-bold text-blue-600">Disabled</p>
				<p class="text-sm text-gray-500 mt-1">Status</p>
			</div>
		</div>
	</div>
</div>
