import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { MAX_DATA_VOLUMES } from './config';

interface SeedEmployeeHistoryOptions {
	clear?: boolean;
	iasId: string;
}

/**
 * Seed Employee History
 * Creates realistic lifecycle events for all employees
 */
export async function seedEmployeeHistory(db: Db, options: SeedEmployeeHistoryOptions): Promise<void> {
	const { clear = false, iasId } = options;

	console.log('📜 Seeding Employee History (3000+ records)...');

	if (clear) {
		await db.collection('employee_history').deleteMany({});
	}

	// Get all employees
	const employees = await db.collection('identities')
		.find({
			identityType: 'employee',
			organizationId: iasId
		})
		.toArray();

	if (employees.length === 0) {
		console.warn('⚠️  No employees found. Run identity seeder first.');
		return;
	}

	// Get org units and positions for history events
	const orgUnits = await db.collection('org_units')
		.find({ organizationId: new ObjectId(iasId) })
		.toArray();

	const positions = await db.collection('positions')
		.find({ organizationId: iasId })
		.toArray();

	const historyRecords = [];

	for (const employee of employees) {
		const events = [];
		const employeeObjId = new ObjectId(employee._id);
		const joinDate = employee.joinDate ? new Date(employee.joinDate) : new Date('2020-01-01');

		// 1. ONBOARDING (every employee has this)
		events.push({
			employeeId: employeeObjId,
			eventType: 'onboarding',
			eventDate: joinDate,
			organizationId: new ObjectId(iasId),
			orgUnitId: employee.orgUnitId ? new ObjectId(employee.orgUnitId) : null,
			positionId: employee.positionId ? new ObjectId(employee.positionId) : null,
			details: {
				employmentType: employee.employmentType || 'permanent',
				workLocation: employee.workLocation || 'CGK',
				probationEndDate: employee.probationEndDate
			},
			createdAt: joinDate,
			createdBy: 'system'
		});

		// 2. MUTATION (40% of employees)
		if (Math.random() < 0.4) {
			const mutationDate = new Date(joinDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year after join
			const newOrgUnit = orgUnits[Math.floor(Math.random() * orgUnits.length)];

			events.push({
				employeeId: employeeObjId,
				eventType: 'mutation',
				eventDate: mutationDate,
				organizationId: new ObjectId(iasId),
				orgUnitId: new ObjectId(newOrgUnit._id),
				positionId: employee.positionId ? new ObjectId(employee.positionId) : null,
				details: {
					mutationType: 'transfer',
					previousOrgUnitId: employee.orgUnitId,
					reason: 'Rotasi karyawan',
					effectiveDate: mutationDate
				},
				createdAt: mutationDate,
				createdBy: 'system'
			});
		}

		// 3. PROMOTION (20% of employees)
		if (Math.random() < 0.2) {
			const promotionDate = new Date(joinDate.getTime() + 730 * 24 * 60 * 60 * 1000); // 2 years after join
			const newPosition = positions[Math.floor(Math.random() * positions.length)];

			events.push({
				employeeId: employeeObjId,
				eventType: 'mutation',
				eventDate: promotionDate,
				organizationId: new ObjectId(iasId),
				orgUnitId: employee.orgUnitId ? new ObjectId(employee.orgUnitId) : null,
				positionId: new ObjectId(newPosition._id),
				details: {
					mutationType: 'promosi',
					previousPositionId: employee.positionId,
					reason: 'Promosi berdasarkan kinerja',
					effectiveDate: promotionDate
				},
				createdAt: promotionDate,
				createdBy: 'system'
			});
		}

		// 4. TRANSFER (30% of employees - different from mutation)
		if (Math.random() < 0.3) {
			const transferDate = new Date(joinDate.getTime() + 547 * 24 * 60 * 60 * 1000); // ~1.5 years
			const newOrgUnit = orgUnits[Math.floor(Math.random() * orgUnits.length)];
			const newPosition = positions[Math.floor(Math.random() * positions.length)];

			events.push({
				employeeId: employeeObjId,
				eventType: 'mutation',
				eventDate: transferDate,
				organizationId: new ObjectId(iasId),
				orgUnitId: new ObjectId(newOrgUnit._id),
				positionId: new ObjectId(newPosition._id),
				details: {
					mutationType: 'transfer',
					previousOrgUnitId: employee.orgUnitId,
					previousPositionId: employee.positionId,
					reason: 'Kebutuhan operasional',
					effectiveDate: transferDate
				},
				createdAt: transferDate,
				createdBy: 'system'
			});
		}

		// 5. ORG RESTRUCTURE (some employees affected by SK Penempatan)
		if (Math.random() < 0.3) {
			const restructureDate = new Date('2024-06-01');

			events.push({
				employeeId: employeeObjId,
				eventType: 'org_restructure',
				eventDate: restructureDate,
				organizationId: new ObjectId(iasId),
				orgUnitId: employee.orgUnitId ? new ObjectId(employee.orgUnitId) : null,
				positionId: employee.positionId ? new ObjectId(employee.positionId) : null,
				details: {
					skNumber: 'SK-003/IAS/2024',
					versionNumber: 4,
					reason: 'Perubahan Struktur Organisasi',
					previousOrgUnitId: employee.orgUnitId
				},
				createdAt: restructureDate,
				createdBy: 'system'
			});
		}

		// 6. OFFBOARDING (only for terminated employees)
		if (employee.employmentStatus === 'terminated') {
			const offboardDate = employee.endDate ? new Date(employee.endDate) : new Date('2024-12-31');

			events.push({
				employeeId: employeeObjId,
				eventType: 'offboarding',
				eventDate: offboardDate,
				organizationId: new ObjectId(iasId),
				orgUnitId: employee.orgUnitId ? new ObjectId(employee.orgUnitId) : null,
				positionId: employee.positionId ? new ObjectId(employee.positionId) : null,
				details: {
					reason: Math.random() < 0.5 ? 'Mengundurkan diri' : 'Kontrak berakhir',
					exitDate: offboardDate,
					ssoAccessRevoked: true
				},
				createdAt: offboardDate,
				createdBy: 'system'
			});
		}

		historyRecords.push(...events);
	}

	// Insert in batches
	const batchSize = 1000;
	for (let i = 0; i < historyRecords.length; i += batchSize) {
		const batch = historyRecords.slice(i, i + batchSize);
		await db.collection('employee_history').insertMany(batch);
		console.log(`   Inserted ${Math.min(i + batchSize, historyRecords.length)}/${historyRecords.length} history records...`);
	}

	console.log(`✅ Created ${historyRecords.length} employee history records`);
	console.log(`   - Avg ${(historyRecords.length / employees.length).toFixed(1)} events per employee`);
}
