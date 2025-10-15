<div class="space-y-6">
	<!-- Info Box -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<span class="text-2xl">ℹ️</span>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Tentang Microsoft Entra ID Sync</h3>
				<p class="mt-1 text-sm text-blue-700">
					Sinkronisasi dengan Microsoft Entra ID (formerly Azure AD) memungkinkan data pengguna dan grup
					dari Aksara SSO disinkronkan ke cloud Microsoft. Anda dapat memilih field mana yang akan disinkronkan
					dan mengatur jadwal sinkronisasi otomatis.
				</p>
			</div>
		</div>
	</div>

	<!-- Connection Status -->
	<div class="bg-white shadow rounded-lg p-6">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-lg font-medium text-gray-900">Connection Status</h3>
			<span class="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
				Not Connected
			</span>
		</div>

		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Tenant ID</label>
				<input
					type="text"
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					class="w-full px-3 py-2 border border-gray-300 rounded-md"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
				<input
					type="text"
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					class="w-full px-3 py-2 border border-gray-300 rounded-md"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
				<input
					type="password"
					placeholder="Enter client secret"
					class="w-full px-3 py-2 border border-gray-300 rounded-md"
				/>
			</div>

			<div class="flex space-x-3">
				<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
					Test Connection
				</button>
				<button class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
					Save Configuration
				</button>
			</div>
		</div>
	</div>

	<!-- Sync Configuration -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Sync Configuration</h3>

		<div class="space-y-4">
			<div class="flex items-center justify-between py-3 border-b">
				<div>
					<p class="font-medium text-gray-900">Sync Users</p>
					<p class="text-sm text-gray-500">Sinkronkan data pengguna ke Entra ID</p>
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input type="checkbox" class="sr-only peer" checked />
					<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
				</label>
			</div>

			<div class="flex items-center justify-between py-3 border-b">
				<div>
					<p class="font-medium text-gray-900">Sync Groups</p>
					<p class="text-sm text-gray-500">Sinkronkan grup/role ke Entra ID</p>
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input type="checkbox" class="sr-only peer" />
					<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
				</label>
			</div>

			<div class="flex items-center justify-between py-3">
				<div>
					<p class="font-medium text-gray-900">Auto Sync</p>
					<p class="text-sm text-gray-500">Sinkronisasi otomatis setiap 1 jam</p>
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input type="checkbox" class="sr-only peer" />
					<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
				</label>
			</div>
		</div>
	</div>

	<!-- Field Mapping -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Field Mapping</h3>

		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksara SSO Field</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entra ID Field</th>
						<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sync</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					<tr>
						<td class="px-6 py-4 text-sm text-gray-900">email</td>
						<td class="px-6 py-4 text-sm text-gray-500">userPrincipalName</td>
						<td class="px-6 py-4 text-center">
							<input type="checkbox" checked class="rounded" />
						</td>
					</tr>
					<tr>
						<td class="px-6 py-4 text-sm text-gray-900">firstName</td>
						<td class="px-6 py-4 text-sm text-gray-500">givenName</td>
						<td class="px-6 py-4 text-center">
							<input type="checkbox" checked class="rounded" />
						</td>
					</tr>
					<tr>
						<td class="px-6 py-4 text-sm text-gray-900">lastName</td>
						<td class="px-6 py-4 text-sm text-gray-500">surname</td>
						<td class="px-6 py-4 text-center">
							<input type="checkbox" checked class="rounded" />
						</td>
					</tr>
					<tr>
						<td class="px-6 py-4 text-sm text-gray-900">phone</td>
						<td class="px-6 py-4 text-sm text-gray-500">mobilePhone</td>
						<td class="px-6 py-4 text-center">
							<input type="checkbox" class="rounded" />
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Sync History -->
	<div class="bg-white shadow rounded-lg p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Sync History</h3>

		<div class="flex justify-between items-center mb-4">
			<p class="text-sm text-gray-500">Recent synchronization attempts</p>
			<button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
				Sync Now
			</button>
		</div>

		<div class="text-center py-12 text-gray-500">
			<p class="text-lg">No sync history yet</p>
			<p class="text-sm mt-2">Configure and test your connection first</p>
		</div>
	</div>
</div>
