import type { Db } from 'mongodb';
import { hash } from '@node-rs/argon2';
import type { User } from '../schemas';

/**
 * Seed users (admin user)
 */
export async function seedUsers(db: Db, options: { clear?: boolean; iasId?: string } = {}) {
	console.log('👤 Seeding users...');

	if (options.clear) {
		await db.collection('users').deleteMany({});
	}

	// Get IAS organization if not provided
	let iasId = options.iasId;
	if (!iasId) {
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			console.warn('⚠️  IAS organization not found. Run organizations seeder first.');
			return null;
		}
		iasId = ias._id.toString();
	}

	const hashedPassword = await hash('password123');

	const adminUser: Partial<User> = {
		email: 'admin@ias.co.id',
		username: 'admin',
		password: hashedPassword,
		firstName: 'System',
		lastName: 'Administrator',
		isActive: true,
		emailVerified: true,
		roles: ['admin', 'user'],
		organizationId: iasId,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const result = await db.collection('users').insertOne(adminUser);
	console.log('✅ Created 1 admin user (admin@ias.co.id / password123)');

	return result.insertedId.toString();
}

// CLI support
if (import.meta.main) {
	const { connectDB, disconnectDB } = await import('../connection');
	try {
		const db = await connectDB();
		await seedUsers(db, { clear: true });
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await disconnectDB();
	}
}
