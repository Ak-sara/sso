import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { SK_STATUS_DISTRIBUTION } from './config';

interface SeedSKPenempatanOptions {
	clear?: boolean;
	iasId: string;
	adminUserId?: string;
}

/**
 * Seed SK Penempatan (Employee Assignment Decrees)
 * Creates 15 SKs with different statuses covering all workflow states
 */
export async function seedSKPenempatan(db: Db, options: SeedSKPenempatanOptions): Promise<void> {
	const { clear = false, iasId, adminUserId } = options;

	console.log('📋 Seeding SK Penempatan (15 decrees)...');

	if (clear) {
		await db.collection('sk_penempatan').deleteMany({});
	}

	// Get all identities for random assignment
	const identities = await db.collection('identities')
		.find({ identityType: 'employee', employmentStatus: 'active' })
		.limit(600) // Use first 600 for reassignments
		.toArray();

	if (identities.length < 100) {
		console.warn('⚠️  Not enough identities for SK Penempatan. Run identity seeder first.');
		return;
	}

	// Get org units and positions for assignments
	const orgUnits = await db.collection('org_units')
		.find({ organizationId: new ObjectId(iasId) })
		.toArray();

	const positions = await db.collection('positions')
		.find({ organizationId: iasId })
		.toArray();

	// Get org structure versions
	const versions = await db.collection('org_structure_versions')
		.find({ organizationId: iasId })
		.sort({ versionNumber: 1 })
		.toArray();

	const skList = [];
	let employeeIndex = 0;

	// Helper to get next batch of employees
	function getEmployeeBatch(count: number) {
		const batch = identities.slice(employeeIndex, employeeIndex + count);
		employeeIndex += count;
		return batch;
	}

	// Helper to create reassignment
	function createReassignment(identity: any, newOrgUnit: any, newPosition?: any) {
		const currentOrgUnit = orgUnits.find(u => u._id.toString() === identity.orgUnitId);
		const currentPosition = positions.find(p => p._id.toString() === identity.positionId);

		return {
			employeeId: identity.employeeId,
			employeeName: identity.fullName,
			previousOrgUnitId: identity.orgUnitId || null,
			previousOrgUnitName: currentOrgUnit?.name || null,
			previousPositionId: identity.positionId || null,
			previousPositionName: currentPosition?.name || null,
			previousWorkLocation: identity.workLocation || null,
			newOrgUnitId: newOrgUnit._id.toString(),
			newOrgUnitName: newOrgUnit.name,
			newPositionId: newPosition?._id.toString() || identity.positionId || null,
			newPositionName: newPosition?.name || currentPosition?.name || null,
			newWorkLocation: identity.workLocation || 'CGK',
			newRegion: identity.region || 'Jakarta',
			reason: 'Perubahan Struktur Organisasi',
			notes: `Berdasarkan restrukturisasi organisasi`,
			executed: false
		};
	}

	// 1-5: EXECUTED SKs (2023-2025)
	const executedCount = SK_STATUS_DISTRIBUTION.executed;
	for (let i = 0; i < executedCount; i++) {
		const year = 2023 + Math.floor(i / 2);
		const count = [200, 150, 100, 80, 120][i];
		const batch = getEmployeeBatch(count);
		const reassignments = batch.map((emp, idx) => {
			const randomOrgUnit = orgUnits[Math.floor(Math.random() * orgUnits.length)];
			const randomPosition = positions[Math.floor(Math.random() * positions.length)];
			const r = createReassignment(emp, randomOrgUnit, randomPosition);
			r.executed = true;
			r.executedAt = new Date(`${year}-${(i + 1) * 2}-15`);
			return r;
		});

		skList.push({
			skNumber: `SK-${String(i + 1).padStart(3, '0')}/IAS/${year}`,
			skDate: new Date(`${year}-${(i + 1) * 2}-10`),
			skTitle: `Penempatan Karyawan ${['Restrukturisasi 2023', 'Ekspansi Regional 2024', 'Merger Departemen 2024', 'Unit Bisnis Baru 2024', 'Reorganisasi Q1 2025'][i]}`,
			effectiveDate: new Date(`${year}-${(i + 1) * 2}-15`),
			signedBy: adminUserId || 'IAS00001',
			signedByPosition: 'Direktur Utama',
			organizationId: iasId,
			orgStructureVersionId: versions[Math.min(i, versions.length - 1)]?._id.toString(),
			status: 'executed',
			reassignments,
			attachments: [],
			importedFromCSV: false,
			totalReassignments: count,
			successfulReassignments: count,
			failedReassignments: 0,
			description: `SK Penempatan terkait ${['restrukturisasi organisasi', 'ekspansi regional', 'merger departemen', 'pembentukan unit baru', 'reorganisasi Q1'][i]}`,
			notes: `Executed successfully on ${new Date(`${year}-${(i + 1) * 2}-15`).toLocaleDateString('id-ID')}`,
			requestedBy: adminUserId || 'system',
			requestedAt: new Date(`${year}-${(i + 1) * 2}-01`),
			approvedBy: adminUserId || 'IAS00001',
			approvedAt: new Date(`${year}-${(i + 1) * 2}-08`),
			createdAt: new Date(`${year}-${(i + 1) * 2}-01`),
			updatedAt: new Date(`${year}-${(i + 1) * 2}-15`),
			createdBy: adminUserId || 'system'
		});
	}

	// 6-8: APPROVED SKs (ready to execute)
	const approvedCount = SK_STATUS_DISTRIBUTION.approved;
	for (let i = 0; i < approvedCount; i++) {
		const count = [60, 40, 30][i];
		const batch = getEmployeeBatch(count);
		const reassignments = batch.map(emp => {
			const randomOrgUnit = orgUnits[Math.floor(Math.random() * orgUnits.length)];
			return createReassignment(emp, randomOrgUnit);
		});

		skList.push({
			skNumber: `SK-${String(executedCount + i + 1).padStart(3, '0')}/IAS/2025`,
			skDate: new Date('2025-01-10'),
			skTitle: `Penempatan Karyawan Batch ${i + 1} Q1 2025`,
			effectiveDate: new Date('2025-02-01'),
			signedBy: adminUserId || 'IAS00001',
			signedByPosition: 'Direktur Utama',
			organizationId: iasId,
			orgStructureVersionId: versions[versions.length - 1]?._id.toString(),
			status: 'approved',
			reassignments,
			attachments: [],
			importedFromCSV: false,
			totalReassignments: count,
			successfulReassignments: 0,
			failedReassignments: 0,
			description: `SK Penempatan siap untuk dieksekusi`,
			notes: `Approved by Direktur, ready for execution`,
			requestedBy: adminUserId || 'system',
			requestedAt: new Date('2025-01-05'),
			approvedBy: adminUserId || 'IAS00001',
			approvedAt: new Date('2025-01-10'),
			createdAt: new Date('2025-01-05'),
			updatedAt: new Date('2025-01-10'),
			createdBy: adminUserId || 'system'
		});
	}

	// 9-11: PENDING APPROVAL SKs
	const pendingCount = SK_STATUS_DISTRIBUTION.pending_approval;
	for (let i = 0; i < pendingCount; i++) {
		const count = [50, 45, 35][i];
		const batch = getEmployeeBatch(count);
		const reassignments = batch.map(emp => {
			const randomOrgUnit = orgUnits[Math.floor(Math.random() * orgUnits.length)];
			return createReassignment(emp, randomOrgUnit);
		});

		skList.push({
			skNumber: `SK-${String(executedCount + approvedCount + i + 1).padStart(3, '0')}/IAS/2025`,
			skDate: new Date('2025-01-15'),
			skTitle: `Penempatan Karyawan Pending ${['CFO Review', 'CEO Approval', 'HR Final Review'][i]}`,
			effectiveDate: new Date('2025-03-01'),
			signedBy: adminUserId || 'IAS00001',
			signedByPosition: 'Direktur Utama',
			organizationId: iasId,
			orgStructureVersionId: versions[versions.length - 1]?._id.toString(),
			status: 'pending_approval',
			reassignments,
			attachments: [],
			importedFromCSV: false,
			totalReassignments: count,
			successfulReassignments: 0,
			failedReassignments: 0,
			description: `SK Penempatan menunggu persetujuan ${['CFO', 'CEO', 'HR'][i]}`,
			notes: `Submitted for ${['CFO', 'CEO', 'HR'][i]} approval`,
			requestedBy: adminUserId || 'system',
			requestedAt: new Date('2025-01-12'),
			createdAt: new Date('2025-01-12'),
			updatedAt: new Date('2025-01-15'),
			createdBy: adminUserId || 'system'
		});
	}

	// 12-13: DRAFT SKs (HR working on)
	const draftCount = SK_STATUS_DISTRIBUTION.draft;
	for (let i = 0; i < draftCount; i++) {
		const count = [25, 20][i];
		const batch = getEmployeeBatch(count);
		const reassignments = batch.map(emp => {
			const randomOrgUnit = orgUnits[Math.floor(Math.random() * orgUnits.length)];
			return createReassignment(emp, randomOrgUnit);
		});

		skList.push({
			skNumber: `SK-${String(executedCount + approvedCount + pendingCount + i + 1).padStart(3, '0')}/IAS/2025`,
			skDate: new Date('2025-01-18'),
			skTitle: `Draft Penempatan ${i === 0 ? 'Incomplete Data' : 'Under Review'}`,
			effectiveDate: new Date('2025-04-01'),
			signedBy: adminUserId || 'IAS00001',
			signedByPosition: 'Direktur Utama',
			organizationId: iasId,
			orgStructureVersionId: versions[versions.length - 1]?._id.toString(),
			status: 'draft',
			reassignments,
			attachments: [],
			importedFromCSV: false,
			totalReassignments: count,
			successfulReassignments: 0,
			failedReassignments: 0,
			description: `SK Penempatan masih dalam tahap penyusunan`,
			notes: `HR team still working on data validation`,
			requestedBy: adminUserId || 'system',
			requestedAt: new Date('2025-01-18'),
			createdAt: new Date('2025-01-18'),
			updatedAt: new Date('2025-01-20'),
			createdBy: adminUserId || 'system'
		});
	}

	// 14-15: CANCELLED SKs (business decision changed)
	const cancelledCount = SK_STATUS_DISTRIBUTION.cancelled;
	for (let i = 0; i < cancelledCount; i++) {
		const count = [30, 20][i];
		const batch = getEmployeeBatch(count);
		const reassignments = batch.map(emp => {
			const randomOrgUnit = orgUnits[Math.floor(Math.random() * orgUnits.length)];
			return createReassignment(emp, randomOrgUnit);
		});

		skList.push({
			skNumber: `SK-${String(executedCount + approvedCount + pendingCount + draftCount + i + 1).padStart(3, '0')}/IAS/2024`,
			skDate: new Date('2024-12-01'),
			skTitle: `Cancelled - ${i === 0 ? 'Business Pivot' : 'Budget Cut'}`,
			effectiveDate: new Date('2025-01-01'),
			signedBy: adminUserId || 'IAS00001',
			signedByPosition: 'Direktur Utama',
			organizationId: iasId,
			orgStructureVersionId: versions[Math.max(0, versions.length - 2)]?._id.toString(),
			status: 'cancelled',
			reassignments,
			attachments: [],
			importedFromCSV: false,
			totalReassignments: count,
			successfulReassignments: 0,
			failedReassignments: 0,
			description: `SK Penempatan dibatalkan karena ${i === 0 ? 'perubahan strategi bisnis' : 'pemotongan anggaran'}`,
			notes: `Cancelled due to ${i === 0 ? 'business strategy change' : 'budget constraints'}`,
			requestedBy: adminUserId || 'system',
			requestedAt: new Date('2024-11-15'),
			rejectedBy: adminUserId || 'IAS00001',
			rejectedAt: new Date('2024-12-05'),
			rejectionReason: i === 0 ? 'Perubahan strategi bisnis' : 'Keterbatasan anggaran',
			createdAt: new Date('2024-11-15'),
			updatedAt: new Date('2024-12-05'),
			createdBy: adminUserId || 'system'
		});
	}

	// Insert all SKs
	if (skList.length > 0) {
		await db.collection('sk_penempatan').insertMany(skList);
		const totalReassignments = skList.reduce((sum, sk) => sum + sk.totalReassignments, 0);
		console.log(`✅ Created ${skList.length} SK Penempatan with ${totalReassignments} total reassignments`);
		console.log(`   - Executed: ${executedCount}`);
		console.log(`   - Approved: ${approvedCount}`);
		console.log(`   - Pending: ${pendingCount}`);
		console.log(`   - Draft: ${draftCount}`);
		console.log(`   - Cancelled: ${cancelledCount}`);
	}
}
