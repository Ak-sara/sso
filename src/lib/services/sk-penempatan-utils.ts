/**
 * SK Penempatan Utilities
 * Shared functions for SK Penempatan management
 */

export interface SKPenempatanStatus {
	value: 'draft' | 'pending_approval' | 'approved' | 'executed' | 'cancelled';
	label: string;
	badge: string;
}

/**
 * Get badge CSS classes for SK status
 */
export function getStatusBadge(status: string): string {
	const badges: Record<string, string> = {
		draft: 'bg-gray-100 text-gray-800',
		pending_approval: 'bg-yellow-100 text-yellow-800',
		approved: 'bg-blue-100 text-blue-800',
		executed: 'bg-green-100 text-green-800',
		cancelled: 'bg-red-100 text-red-800'
	};
	return badges[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get human-readable label for SK status
 */
export function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		draft: 'Draft',
		pending_approval: 'Menunggu Persetujuan',
		approved: 'Disetujui',
		executed: 'Sudah Dieksekusi',
		cancelled: 'Dibatalkan'
	};
	return labels[status] || status;
}

/**
 * Get all available SK statuses
 */
export function getAllStatuses(): SKPenempatanStatus[] {
	return [
		{ value: 'draft', label: 'Draft', badge: getStatusBadge('draft') },
		{
			value: 'pending_approval',
			label: 'Menunggu Persetujuan',
			badge: getStatusBadge('pending_approval')
		},
		{ value: 'approved', label: 'Disetujui', badge: getStatusBadge('approved') },
		{ value: 'executed', label: 'Sudah Dieksekusi', badge: getStatusBadge('executed') },
		{ value: 'cancelled', label: 'Dibatalkan', badge: getStatusBadge('cancelled') }
	];
}

/**
 * Download CSV template for employee reassignment
 */
export function downloadCSVTemplate(): void {
	const template = `NIK,Nama,Unit Kerja Baru,Posisi Baru,Lokasi Kerja,Region,Alasan,Catatan
IAS-001,Budi Santoso,IT,Manager,Jakarta,Pusat,Promosi,Promoted to Manager
IAS-002,Siti Nurhaliza,ACC,Senior Staff,Jakarta,Pusat,Rotasi,Regular rotation`;

	const blob = new Blob([template], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'template_penempatan_karyawan.csv';
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Format date to Indonesian locale
 */
export function formatDateID(date: string | Date): string {
	try {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('id-ID');
	} catch {
		return '-';
	}
}
