<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const user = $derived(data.user);
</script>

<svelte:head>
	<title>Profil Saya - Aksara SSO</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="bg-white rounded-lg shadow-sm border border-gray-200">
		<!-- Header -->
		<div class="border-b border-gray-200 px-6 py-4">
			<h2 class="text-2xl font-bold text-gray-900">Profil Saya</h2>
			<p class="text-sm text-gray-600 mt-1">Kelola informasi profil Anda</p>
		</div>

		<!-- Profile Content -->
		<div class="p-6 space-y-6">
			<!-- Avatar Section -->
			<div class="flex items-center space-x-6">
				<div class="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center">
					<span class="text-white text-3xl font-bold">
						{user.firstName?.[0] || user.email?.[0].toUpperCase()}
					</span>
				</div>
				<div>
					<h3 class="text-xl font-semibold text-gray-900">
						{user.firstName && user.lastName
							? `${user.firstName} ${user.lastName}`
							: user.username}
					</h3>
					<p class="text-gray-600">{user.email}</p>
					<div class="flex gap-2 mt-2">
						{#each user.roles as role}
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
								{role}
							</span>
						{/each}
					</div>
				</div>
			</div>

			<!-- Information Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Username -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
					<div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
						{user.username}
					</div>
				</div>

				<!-- Email -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
					<div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
						{user.email}
					</div>
				</div>

				<!-- First Name -->
				{#if user.firstName}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Nama Depan</label>
						<div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
							{user.firstName}
						</div>
					</div>
				{/if}

				<!-- Last Name -->
				{#if user.lastName}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Nama Belakang</label>
						<div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
							{user.lastName}
						</div>
					</div>
				{/if}

				<!-- Organization -->
				{#if user.organizationId}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Organisasi</label>
						<div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
							{user.organizationId}
						</div>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex gap-3 pt-4">
				<a
					href="/profile/edit"
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
				>
					Edit Profil
				</a>
				<a
					href="/profile/change-password"
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Ubah Password
				</a>
			</div>
		</div>
	</div>
</div>
