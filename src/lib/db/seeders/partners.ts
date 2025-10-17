import type { Db } from 'mongodb';
import type { Partner } from '../schemas';

/**
 * Seed partners
 */
export async function seedPartners(db: Db, options: { clear?: boolean; iasId?: string } = {}) {
	console.log('🤝 Seeding partners...');

	if (options.clear) {
		await db.collection('partners').deleteMany({});
	}

	// Get IAS organization if not provided
	let iasId = options.iasId;
	if (!iasId) {
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			console.warn('⚠️  IAS organization not found. Run organizations seeder first.');
			return;
		}
		iasId = ias._id.toString();
	}

	const partners: Partial<Partner>[] = [
		{
			partnerId: 'PARTNER-001',
			organizationId: iasId,
			type: 'vendor',
			companyName: 'PT Vendor Services',
			contactName: 'John Vendor',
			email: 'john@vendor.co.id',
			phone: '+6281234560001',
			accessLevel: 'read',
			contractNumber: 'CONTRACT-2024-001',
			contractStartDate: new Date('2024-01-01'),
			contractEndDate: new Date('2024-12-31'),
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			partnerId: 'PARTNER-002',
			organizationId: iasId,
			type: 'consultant',
			companyName: 'PT Consultant Expert',
			contactName: 'Jane Consultant',
			email: 'jane@consultant.co.id',
			phone: '+6281234560002',
			accessLevel: 'write',
			contractNumber: 'CONTRACT-2024-002',
			contractStartDate: new Date('2024-03-01'),
			contractEndDate: new Date('2025-03-01'),
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	];

	await db.collection('partners').insertMany(partners);
	console.log(`✅ Created ${partners.length} partners`);
}

// CLI support
if (import.meta.main) {
	const { connectDB, disconnectDB } = await import('../connection');
	try {
		const db = await connectDB();
		await seedPartners(db, { clear: true });
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await disconnectDB();
	}
}
