import type { Db } from 'mongodb';
import { hash } from '@node-rs/argon2';
import type { Identity } from '../schemas';

interface SeedIdentitiesOptions {
	clear?: boolean;
	count?: number;
	organizationId: string;
	unitMap: Record<string, any>;
	positionIds: string[];
}

const firstNames = [
	'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi',
	'Indra', 'Joko', 'Kiki', 'Lina', 'Made', 'Novi', 'Oka', 'Putu',
	'Rina', 'Sari', 'Tono', 'Umar', 'Vina', 'Wati', 'Yudi', 'Zaki',
	'Ani', 'Bayu', 'Candra', 'Dani', 'Endang', 'Fitri', 'Galih', 'Hesti'
];

const lastNames = [
	'Pratama', 'Wijaya', 'Kusuma', 'Santoso', 'Hidayat', 'Rahman', 'Saputra', 'Permana',
	'Setiawan', 'Kurniawan', 'Putra', 'Wibowo', 'Nugroho', 'Hartono', 'Gunawan', 'Sutanto',
	'Prabowo', 'Susanto', 'Firmansyah', 'Utomo', 'Hakim', 'Prasetyo', 'Dharma', 'Wijayanto'
];

const workLocations = ['CGK', 'DPS', 'KNO', 'UPG', 'SUB', 'BDO', 'PLM', 'PDG'];
const employmentTypes = ['permanent', 'pkwt', 'outsource', 'contract'] as const;

function randomItem<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function generateNIK(index: number): string {
	return `IAS${String(index).padStart(5, '0')}`;
}

/**
 * Seed identities (employees, partners, external users)
 * This replaces seedUsers() and seedEmployees()
 */
export async function seedIdentities(db: Db, options: SeedIdentitiesOptions): Promise<string> {
	const { count = 100, organizationId, unitMap, positionIds, clear = false } = options;

	console.log(`👥 Seeding ${count} employee identities...`);

	// Clear existing identities if requested
	if (clear) {
		console.log('🗑️  Clearing existing identities...');
		await db.collection('identities').deleteMany({});
		console.log('✅ Identities cleared');
	}

	// Hash password once for all users
	const hashedPassword = await hash('password123', {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

	const identities: Omit<Identity, '_id'>[] = [];

	// 1. Create admin identity
	const adminIdentity: Omit<Identity, '_id'> = {
		identityType: 'employee',
		username: 'admin@ias.co.id',
		email: 'admin@ias.co.id',
		password: hashedPassword,
		isActive: true,
		emailVerified: true,
		roles: ['admin', 'hr', 'user'],
		firstName: 'Admin',
		lastName: 'System',
		fullName: 'Admin System',
		phone: '+62811223344',
		organizationId,
		employeeId: 'IAS00001',
		orgUnitId: Object.values(unitMap).find((u: any) => u.code === 'DU')?._id.toString(),
		positionId: positionIds[0], // Executive position
		employmentType: 'permanent',
		employmentStatus: 'active',
		joinDate: new Date('2020-01-01'),
		workLocation: 'CGK',
		gender: 'male',
		isRemote: false,
		secondaryAssignments: [],
		customProperties: {},
		createdAt: new Date(),
		updatedAt: new Date()
	};

	identities.push(adminIdentity);

	// 2. Create employee identities
	for (let i = 2; i <= count; i++) {
		const firstName = randomItem(firstNames);
		const lastName = randomItem(lastNames);
		const fullName = `${firstName} ${lastName}`;
		const nik = generateNIK(i);

		// 70% have email, 30% don't (will use NIK as username)
		const hasEmail = Math.random() > 0.3;
		// Add unique suffix (last 3 digits of NIK) to prevent duplicates
		const emailSuffix = nik.slice(-3);
		const email = hasEmail ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}@ias.co.id` : undefined;
		const username = email || nik;

		// Random org unit
		const unitKeys = Object.keys(unitMap);
		const randomUnitKey = unitKeys.length > 0 ? randomItem(unitKeys) : null;
		const orgUnit = randomUnitKey ? unitMap[randomUnitKey] : null;

		// Random employment type with realistic distribution
		const rand = Math.random();
		let employmentType: typeof employmentTypes[number];
		let employmentStatus: 'active' | 'probation' | 'terminated' | 'resigned';

		if (rand < 0.6) {
			employmentType = 'permanent';
			employmentStatus = 'active';
		} else if (rand < 0.8) {
			employmentType = 'pkwt';
			employmentStatus = Math.random() > 0.9 ? 'probation' : 'active';
		} else if (rand < 0.9) {
			employmentType = 'outsource';
			employmentStatus = 'active';
		} else {
			employmentType = 'contract';
			employmentStatus = 'active';
		}

		// 5% inactive (resigned/terminated)
		const isActive = Math.random() > 0.05;
		if (!isActive) {
			employmentStatus = Math.random() > 0.5 ? 'resigned' : 'terminated';
		}

		// Random join date in last 5 years
		const joinDate = new Date();
		joinDate.setFullYear(joinDate.getFullYear() - Math.floor(Math.random() * 5));
		joinDate.setMonth(Math.floor(Math.random() * 12));

		const identity: Omit<Identity, '_id'> = {
			identityType: 'employee',
			username,
			email,
			password: hashedPassword,
			isActive,
			emailVerified: hasEmail,
			roles: ['user'],
			firstName,
			lastName,
			fullName,
			phone: `+628${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
			organizationId,
			employeeId: nik,
			orgUnitId: orgUnit?._id?.toString() || undefined,
			positionId: positionIds.length > 0 ? randomItem(positionIds) : undefined,
			employmentType,
			employmentStatus,
			joinDate,
			endDate: employmentType === 'pkwt' ? new Date(joinDate.getTime() + 365 * 24 * 60 * 60 * 1000) : undefined,
			probationEndDate: employmentStatus === 'probation' ? new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000) : undefined,
			workLocation: randomItem(workLocations),
			region: `Regional ${Math.floor(Math.random() * 4) + 1}`,
			gender: Math.random() > 0.5 ? 'male' : 'female',
			isRemote: Math.random() > 0.8,
			dateOfBirth: new Date(1980 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
			idNumber: `${3100 + Math.floor(Math.random() * 100)}${Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0')}`,
			taxId: `${Math.floor(Math.random() * 100)}${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}`,
			secondaryAssignments: [],
			customProperties: {},
			createdAt: new Date(),
			updatedAt: new Date()
		};

		identities.push(identity);

		if (i % 100 === 0) {
			console.log(`   Generated ${i}/${count} identities...`);
		}
	}

	// 3. Insert all identities
	const result = await db.collection('identities').insertMany(identities as Identity[]);
	console.log(`   ✓ Created ${result.insertedCount} employee identities`);

	// 4. Create partner identities
	console.log('🤝 Seeding partner identities...');

	const partnerIdentities: Omit<Identity, '_id'>[] = [
		{
			identityType: 'partner',
			username: 'vendor1@supplycorp.com',
			email: 'vendor1@supplycorp.com',
			password: hashedPassword,
			isActive: true,
			emailVerified: true,
			roles: ['user'],
			firstName: 'John',
			lastName: 'Supplier',
			fullName: 'John Supplier',
			phone: '+62811334455',
			organizationId,
			partnerType: 'vendor',
			companyName: 'Supply Corp Indonesia',
			contractNumber: 'CTR-2024-001',
			contractStartDate: new Date('2024-01-01'),
			contractEndDate: new Date('2025-12-31'),
			accessLevel: 'read',
			allowedModules: ['procurement', 'inventory'],
			customProperties: {},
			createdAt: new Date(),
			updatedAt: new Date()
		},
		{
			identityType: 'partner',
			username: 'consultant@techconsult.com',
			email: 'consultant@techconsult.com',
			password: hashedPassword,
			isActive: true,
			emailVerified: true,
			roles: ['user'],
			firstName: 'Sarah',
			lastName: 'Consultant',
			fullName: 'Sarah Consultant',
			phone: '+62811445566',
			organizationId,
			partnerType: 'consultant',
			companyName: 'Tech Consulting Partners',
			contractNumber: 'CTR-2024-002',
			contractStartDate: new Date('2024-06-01'),
			contractEndDate: new Date('2024-12-31'),
			accessLevel: 'write',
			allowedModules: ['projects', 'reports'],
			customProperties: {},
			createdAt: new Date(),
			updatedAt: new Date()
		}
	];

	const partnerResult = await db.collection('identities').insertMany(partnerIdentities as Identity[]);
	console.log(`   ✓ Created ${partnerResult.insertedCount} partner identities`);

	// 5. Create external user identity
	console.log('🌐 Seeding external identities...');

	const externalIdentities: Omit<Identity, '_id'>[] = [
		{
			identityType: 'external',
			username: 'auditor@external.com',
			email: 'auditor@external.com',
			password: hashedPassword,
			isActive: true,
			emailVerified: true,
			roles: ['user'],
			firstName: 'External',
			lastName: 'Auditor',
			fullName: 'External Auditor',
			phone: '+62811556677',
			organizationId,
			customProperties: {
				purpose: 'Annual audit 2024',
				validUntil: '2024-12-31'
			},
			createdAt: new Date(),
			updatedAt: new Date()
		}
	];

	const externalResult = await db.collection('identities').insertMany(externalIdentities as Identity[]);
	console.log(`   ✓ Created ${externalResult.insertedCount} external identities`);

	// Return admin identity ID for OAuth/audit logs
	const adminDoc = await db.collection('identities').findOne({ email: 'admin@ias.co.id' });
	return adminDoc?._id.toString() || '';
}
