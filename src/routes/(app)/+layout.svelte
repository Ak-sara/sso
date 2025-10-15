<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
	}

	let { data }: Props = $props();
	let isSidebarOpen = $state(true);
	let showUserMenu = $state(false);
	let expandedGroups = $state<Record<string, boolean>>({
		identity: true,
		organization: true,
		integration: true,
	});

	const user = $derived(data.user);
	const userInitial = $derived(user?.firstName?.[0] || user?.email?.[0].toUpperCase() || 'U');
	const userName = $derived(
		user?.firstName && user?.lastName
			? `${user.firstName} ${user.lastName}`
			: user?.firstName || user?.username || 'User'
	);

	interface NavItem {
		name: string;
		href: string;
		icon: string;
	}

	interface NavGroup {
		name: string;
		icon: string;
		items: NavItem[];
	}

	const navigation: (NavItem | NavGroup)[] = [
		{ name: 'Dashboard', href: '/', icon: '📊' },
		{
			name: 'Identitas',
			icon: '👥',
			items: [
				{ name: 'SSO Users', href: '/users', icon: '🔐' },
				{ name: 'Karyawan', href: '/employees', icon: '👨‍💼' },
				{ name: 'Data Sync', href: '/employees/sync', icon: '🔄' },
				{ name: 'Partner/Eksternal', href: '/partners', icon: '🤝' },
			],
		},
		{
			name: 'Organisasi',
			icon: '🏢',
			items: [
				{ name: 'Realm/Entitas', href: '/realms', icon: '🌐' },
				{ name: 'Unit Kerja/Divisi', href: '/org-units', icon: '🏛️' },
				{ name: 'Struktur Organisasi', href: '/org-structure', icon: '🌳' },
				{ name: 'Versi Struktur', href: '/org-structure/versions', icon: '📋' },
				{ name: 'Posisi/Jabatan', href: '/positions', icon: '💼' },
				{ name: 'SK Penempatan', href: '/sk-penempatan', icon: '📄' },
			],
		},
		{
			name: 'Integrasi',
			icon: '🔌',
			items: [
				{ name: 'OAuth Clients', href: '/clients', icon: '🔑' },
				{ name: 'SCIM Configuration', href: '/scim', icon: '🔄' },
				{ name: 'Entra ID Sync', href: '/entraid-sync', icon: '☁️' },
			],
		},
		{ name: 'Audit Log', href: '/audit', icon: '📋' },
	];

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	}

	function toggleUserMenu() {
		showUserMenu = !showUserMenu;
	}

	function toggleGroup(groupName: string) {
		expandedGroups[groupName] = !expandedGroups[groupName];
	}

	function isGroup(item: NavItem | NavGroup): item is NavGroup {
		return 'items' in item;
	}

	function isActive(href: string): boolean {
		return $page.url.pathname === href;
	}

	function isGroupActive(group: NavGroup): boolean {
		return group.items.some(item => $page.url.pathname === item.href);
	}
</script>

<div class="min-h-screen bg-gray-100">
	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-50 bg-indigo-900 text-white transform transition-all duration-200 ease-in-out {isSidebarOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full md:translate-x-0'}"
	>
		<div class="flex flex-col h-full">
			<!-- Logo -->
			<div class="flex items-center justify-between h-16 px-4 border-b border-indigo-800">
				{#if isSidebarOpen}
					<div class="flex items-center space-x-2">
						<span class="text-2xl">🔐</span>
						<span class="text-xl font-bold">Aksara SSO</span>
					</div>
				{:else}
					<span class="text-2xl">🔐</span>
				{/if}
			</div>

			<!-- Navigation -->
			<nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
				{#each navigation as item}
					{#if isGroup(item)}
						<!-- Group with collapsible submenu -->
						<div class="space-y-1">
							<button
								onclick={() => toggleGroup(item.name.toLowerCase())}
								class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors {isGroupActive(item)
									? 'bg-indigo-800 text-white'
									: 'text-indigo-100 hover:bg-indigo-800 hover:text-white'}"
								title={item.name}
							>
								<div class="flex items-center">
									<span class="text-xl {isSidebarOpen ? 'mr-3' : ''}">{item.icon}</span>
									{#if isSidebarOpen}
										{item.name}
									{/if}
								</div>
								{#if isSidebarOpen}
									<span class="text-xs transition-transform {expandedGroups[item.name.toLowerCase()] ? 'rotate-180' : ''}">
										▼
									</span>
								{/if}
							</button>

							<!-- Submenu -->
							{#if isSidebarOpen && expandedGroups[item.name.toLowerCase()]}
								<div class="ml-4 space-y-1">
									{#each item.items as subItem}
										<a
											href={subItem.href}
											class="flex items-center px-4 py-2 text-sm rounded-lg transition-colors {isActive(subItem.href)
												? 'bg-indigo-700 text-white'
												: 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}"
										>
											<span class="text-base mr-2">{subItem.icon}</span>
											{subItem.name}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<!-- Single item -->
						<a
							href={item.href}
							class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors {isActive(item.href)
								? 'bg-indigo-800 text-white'
								: 'text-indigo-100 hover:bg-indigo-800 hover:text-white'}"
							title={item.name}
						>
							<span class="text-xl {isSidebarOpen ? 'mr-3' : ''}">{item.icon}</span>
							{#if isSidebarOpen}
								{item.name}
							{/if}
						</a>
					{/if}
				{/each}
			</nav>
		</div>
	</aside>

	<!-- Mobile Overlay -->
	{#if isSidebarOpen}
		<button
			onclick={toggleSidebar}
			class="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
		></button>
	{/if}

	<!-- Main Content -->
	<div class="transition-all duration-200 {isSidebarOpen ? 'lg:pl-64' : 'lg:pl-16'}">
		<!-- Top Bar -->
		<header class="sticky top-0 z-40 bg-white shadow-sm">
			<div class="flex items-center justify-between h-16 px-4">
				<div class="flex items-center space-x-4">
					<button
						onclick={toggleSidebar}
						class="p-2 rounded-md hover:bg-gray-100 transition-colors"
						title={isSidebarOpen ? 'Tutup Menu' : 'Buka Menu'}
					>
						<span class="text-2xl">{isSidebarOpen ? '◀' : '☰'}</span>
					</button>

					<h1 class="text-xl font-semibold text-gray-900">
						{#if $page.url.pathname === '/'}
							Dashboard
						{:else if $page.url.pathname === '/users'}
							SSO Users
						{:else if $page.url.pathname === '/employees'}
							Manajemen Karyawan
						{:else if $page.url.pathname === '/partners'}
							Partner/Eksternal
						{:else if $page.url.pathname === '/realms'}
							Realm/Entitas
						{:else if $page.url.pathname === '/org-units'}
							Unit Kerja/Divisi
						{:else if $page.url.pathname === '/org-structure'}
							Struktur Organisasi
						{:else if $page.url.pathname === '/positions'}
							Posisi/Jabatan
						{:else if $page.url.pathname === '/clients'}
							OAuth Clients
						{:else if $page.url.pathname === '/scim'}
							SCIM Configuration
						{:else if $page.url.pathname === '/entraid-sync'}
							Entra ID Sync
						{:else if $page.url.pathname === '/audit'}
							Audit Log
						{/if}
					</h1>
				</div>

				<div class="flex items-center space-x-2">
					<!-- Current Realm Badge -->
					<div class="hidden sm:flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-sm">
						<span class="mr-1">🌐</span>
						<span class="font-medium">IAS Realm</span>
					</div>

					<button class="p-2 rounded-md hover:bg-gray-100 transition-colors" title="Notifikasi">
						<span class="text-xl">🔔</span>
					</button>

					<!-- User Menu Dropdown -->
					<div class="relative">
						<button
							onclick={toggleUserMenu}
							class="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
						>
							<div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
								<span class="text-white text-sm font-medium">{userInitial}</span>
							</div>
							<div class="hidden md:block text-left">
								<p class="text-sm font-medium text-gray-700">{userName}</p>
								<p class="text-xs text-gray-500">{user?.email}</p>
							</div>
						</button>

						{#if showUserMenu}
							<div class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50">
								<a href="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
									👤 Profil Saya
								</a>
								<a href="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
									⚙️ Pengaturan
								</a>
								<hr class="my-1" />
								<form method="POST" action="/logout">
									<button type="submit" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
										🚪 Keluar
									</button>
								</form>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</header>

		<!-- Page Content -->
		<main class="p-6">
			<slot />
		</main>
	</div>
</div>

<!-- Click outside to close user menu -->
{#if showUserMenu}
	<button
		onclick={toggleUserMenu}
		class="fixed inset-0 z-30"
	></button>
{/if}
