import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async () => {
	const db = getDB();

	// Get statistics
	const [usersCount, orgsCount, unitsCount, clientsCount] = await Promise.all([
		db.collection('identities').countDocuments(),
		db.collection('organizations').countDocuments(),
		db.collection('org_units').countDocuments(),
		db.collection('oauth_clients').countDocuments(),
	]);

	// Get recent audit logs (last 5)
	const auditLogs = await db.collection('audit_logs')
		.find({})
		.sort({ timestamp: -1 })
		.limit(5)
		.toArray();

	// Map action icons
	const getActionIcon = (action: string) => {
		const icons: Record<string, string> = {
			login: '🔐',
			logout: '🚪',
			'login_failed': '❌',
			'create_identity': '👤',
			'update_identity': '✏️',
			'employee_onboard': '🎉',
			'employee_mutation': '🔄',
			'employee_offboard': '👋',
			'oauth_token_grant': '🔑',
			'oauth_token_refresh': '🔄',
			'create_organization': '🏢',
			'update_organization': '🔧',
			'access_denied': '⛔'
		};
		return icons[action] || '📋';
	};

	const getActionDescription = (action: string, details: any) => {
		const descriptions: Record<string, string> = {
			login: `Login berhasil: ${details.email || details.username || 'user'}`,
			logout: `Logout: ${details.email || details.username || 'user'}`,
			login_failed: `Login gagal: ${details.username || 'user'} - ${details.reason || 'invalid credentials'}`,
			create_identity: `Identitas baru dibuat: ${details.identityType || 'user'}`,
			update_identity: `Identitas diperbarui`,
			employee_onboard: `Onboarding karyawan: ${details.employeeName || 'employee'}`,
			employee_mutation: `Mutasi karyawan: ${details.employeeName || 'employee'}`,
			employee_promotion: `Promosi karyawan: ${details.employeeName || 'employee'}`,
			employee_offboard: `Offboarding karyawan: ${details.employeeName || 'employee'}`,
			oauth_token_grant: `Token OAuth diberikan: ${details.clientName || details.clientId || 'client'}`,
			oauth_token_refresh: `Token OAuth di-refresh: ${details.clientName || details.clientId || 'client'}`,
			create_organization: `Organisasi baru: ${details.resourceName || 'organization'}`,
			update_organization: `Organisasi diperbarui: ${details.resourceName || 'organization'}`,
			access_denied: `Akses ditolak: ${details.resource || 'resource'}`
		};
		return descriptions[action] || `${action}: ${details.resourceName || ''}`;
	};

	// Format relative time
	const formatRelativeTime = (date: Date) => {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Baru saja';
		if (diffMins < 60) return `${diffMins} menit lalu`;
		if (diffHours < 24) return `${diffHours} jam lalu`;
		if (diffDays < 7) return `${diffDays} hari lalu`;
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	};

	const recentActivity = auditLogs.map(log => ({
		icon: getActionIcon(log.action),
		description: getActionDescription(log.action, log.details || {}),
		time: formatRelativeTime(log.timestamp)
	}));

	return {
		stats: {
			users: usersCount,
			organizations: orgsCount,
			units: unitsCount,
			clients: clientsCount,
		},
		recentActivity,
	};
};
