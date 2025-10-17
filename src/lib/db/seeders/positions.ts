import type { Db } from 'mongodb';
import type { Position } from '../schemas';

/**
 * Seed positions
 */
export async function seedPositions(db: Db, options: { clear?: boolean; iasId?: string } = {}) {
	console.log('💼 Seeding positions...');

	if (options.clear) {
		await db.collection('positions').deleteMany({});
	}

	// Get IAS organization if not provided
	let iasId = options.iasId;
	if (!iasId) {
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			console.warn('⚠️  IAS organization not found. Run organizations seeder first.');
			return [];
		}
		iasId = ias._id.toString();
	}

	const positions: Partial<Position>[] = [
		{ code: 'DIR', name: 'Direktur', level: 'executive', grade: 'E1', organizationId: iasId },
		{ code: 'GM', name: 'General Manager', level: 'senior', grade: 'S1', organizationId: iasId },
		{ code: 'MGR', name: 'Manager', level: 'middle', grade: 'M1', organizationId: iasId },
		{ code: 'SPV', name: 'Supervisor', level: 'middle', grade: 'M2', organizationId: iasId },
		{ code: 'STA', name: 'Staff', level: 'staff', grade: 'J1', organizationId: iasId },
		{ code: 'SSTA', name: 'Senior Staff', level: 'junior', grade: 'J2', organizationId: iasId },
	];

	const result = await db.collection('positions').insertMany(positions);
	const positionIds = Object.values(result.insertedIds).map(id => id.toString());

	console.log(`✅ Created ${positions.length} positions`);
	return positionIds;
}

// CLI support
if (import.meta.main) {
	const { connectDB, disconnectDB } = await import('../connection');
	try {
		const db = await connectDB();
		await seedPositions(db, { clear: true });
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await disconnectDB();
	}
}
