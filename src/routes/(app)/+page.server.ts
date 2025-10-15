import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';

export const load: PageServerLoad = async () => {
	const db = getDB();

	// Get statistics
	const [usersCount, employeesCount, orgsCount, clientsCount] = await Promise.all([
		db.collection('users').countDocuments(),
		db.collection('employees').countDocuments(),
		db.collection('organizations').countDocuments(),
		db.collection('oauth_clients').countDocuments(),
	]);

	// Get recent activity (mock data for now)
	const recentActivity = [
		{
			icon: '👤',
			description: 'User baru ditambahkan: ahmad.wijaya@ias.co.id',
			time: '2 jam lalu',
		},
		{
			icon: '👨‍💼',
			description: 'Data karyawan diperbarui: Siti Nurhaliza',
			time: '4 jam lalu',
		},
		{
			icon: '🔑',
			description: 'OAuth client baru dibuat: HR Management System',
			time: '1 hari lalu',
		},
		{
			icon: '🏢',
			description: 'Organisasi baru: IAS Support',
			time: '2 hari lalu',
		},
	];

	return {
		stats: {
			users: usersCount,
			employees: employeesCount,
			organizations: orgsCount,
			clients: clientsCount,
		},
		recentActivity,
	};
};
