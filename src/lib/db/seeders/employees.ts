import type { Db } from 'mongodb';
import type { Employee } from '../schemas';

interface EmployeeGeneratorOptions {
	count: number;
	organizationId: string;
	unitMap: Record<string, any>;
	positionIds: string[];
}

const indonesianFirstNames = {
	male: [
		'Ahmad', 'Budi', 'Rudi', 'Dedi', 'Eko', 'Agus', 'Bambang', 'Hadi', 'Wawan', 'Joko',
		'Made', 'Putu', 'Ketut', 'Nyoman', 'Rizki', 'Fajar', 'Andi', 'Yudi', 'Aan', 'Denny',
		'Reza', 'Irfan', 'Hafiz', 'Arif', 'Bayu', 'Cahya', 'Dimas', 'Fikri', 'Gilang', 'Hendra',
		'Ilham', 'Jaya', 'Krisna', 'Lukman', 'Mahendra', 'Nanda', 'Oka', 'Pandu', 'Rama', 'Surya',
		'Teguh', 'Umar', 'Vino', 'Wahyu', 'Yoga', 'Zaki', 'Aditya', 'Bobby', 'Candra', 'Dwi',
		'Eko', 'Firman', 'Gani', 'Haris', 'Ivan', 'Jefri', 'Kevin', 'Leo', 'Mulyono', 'Naufal',
		'Oscar', 'Prasetyo', 'Qori', 'Rio', 'Satrio', 'Tono', 'Udin', 'Victor', 'Wisnu', 'Yanto'
	],
	female: [
		'Siti', 'Dewi', 'Rina', 'Lisa', 'Ani', 'Sri', 'Wati', 'Sari', 'Lestari', 'Fitri',
		'Nur', 'Ayu', 'Putri', 'Maya', 'Nia', 'Dian', 'Ratna', 'Indah', 'Yuni', 'Eka',
		'Rini', 'Tuti', 'Uci', 'Vina', 'Winda', 'Yanti', 'Zahra', 'Amel', 'Bella', 'Citra',
		'Dini', 'Elsa', 'Farah', 'Gita', 'Hanna', 'Intan', 'Julia', 'Kartika', 'Lina', 'Mira',
		'Nisa', 'Oktavia', 'Prita', 'Qonita', 'Rani', 'Shinta', 'Tiara', 'Ulfa', 'Vera', 'Wulan',
		'Xenia', 'Yasmin', 'Zulfa', 'Annisa', 'Bunga', 'Clara', 'Diana', 'Elma', 'Fani', 'Gina',
		'Hesti', 'Ima', 'Jelita', 'Kiki', 'Laras', 'Melati', 'Nina', 'Olivia', 'Poppy', 'Qory'
	]
};

const indonesianLastNames = [
	'Wijaya', 'Santoso', 'Lestari', 'Susanti', 'Hermawan', 'Anggraini', 'Sudana', 'Kusuma',
	'Pratama', 'Putra', 'Sari', 'Nugroho', 'Hidayat', 'Setiawan', 'Wibowo', 'Kurniawan',
	'Prabowo', 'Rahman', 'Permana', 'Saputra', 'Utomo', 'Halim', 'Gunawan', 'Suharto',
	'Mahardika', 'Firmansyah', 'Alamsyah', 'Budiman', 'Cahyono', 'Darmawan', 'Fadillah',
	'Hakim', 'Indarto', 'Kurnia', 'Maulana', 'Noor', 'Pamungkas', 'Ramadhan', 'Safitri',
	'Trianto', 'Wahyudi', 'Yusuf', 'Adiputra', 'Baskara', 'Chandra', 'Darma', 'Eko',
	'Firdaus', 'Ginting', 'Handoko', 'Iskandar', 'Junaidi', 'Kusumawati', 'Lubis', 'Mulyadi'
];

const regions = ['Pusat', 'Regional 1', 'Regional 2', 'Regional 3', 'Regional 4'];
const locations = ['Jakarta', 'KNO', 'CGK', 'DPS', 'UPG', 'SUB', 'BPN', 'MDC'];

function randomChoice<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function generateIndonesianName(): { firstName: string; lastName: string; gender: 'male' | 'female' } {
	const gender = Math.random() > 0.5 ? 'male' : 'female';
	const firstName = randomChoice(indonesianFirstNames[gender]);
	const lastName = randomChoice(indonesianLastNames);
	return { firstName, lastName, gender };
}

function generateEmployeeData(
	index: number,
	organizationId: string,
	unitMap: Record<string, any>,
	positionIds: string[],
	usedEmails: Set<string>
): Partial<Employee> {
	const { firstName, lastName, gender } = generateIndonesianName();
	const fullName = `${firstName} ${lastName}`;

	// Generate unique email with suffix if needed
	let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ias.co.id`;
	let emailSuffix = 1;

	// Keep adding suffix until we get a unique email
	while (usedEmails.has(email)) {
		email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}@ias.co.id`;
		emailSuffix++;
	}

	// Mark this email as used
	usedEmails.add(email);

	// Distribute employees across different employment types
	const rand = Math.random();
	let employmentType: 'permanent' | 'PKWT' | 'OS';
	let endDate: Date | undefined;
	let customProps: Record<string, any> = {};

	if (rand < 0.7) {
		employmentType = 'permanent';
		customProps.employmentType = 'Permanent';
	} else if (rand < 0.9) {
		employmentType = 'PKWT';
		endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2); // 2 years from now
		customProps = {
			employmentType: 'PKWT',
			contractEndDate: endDate.toISOString().split('T')[0]
		};
	} else {
		employmentType = 'OS';
		customProps = {
			employmentType: 'OS',
			vendor: 'PT Outsourcing Partner'
		};
	}

	// Get random org unit and position
	const unitKeys = Object.keys(unitMap);
	const randomUnitKey = randomChoice(unitKeys);
	const randomPositionIndex = Math.floor(Math.random() * positionIds.length);

	// Generate random dates
	const joinDate = new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000); // Random within last 5 years
	const probationEndDate = employmentType === 'permanent' ? new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000) : undefined;
	const dateOfBirth = new Date(Date.now() - (25 + Math.random() * 20) * 365 * 24 * 60 * 60 * 1000); // Age 25-45

	return {
		employeeId: `IAS-${String(index + 1).padStart(4, '0')}`,
		organizationId,
		orgUnitId: unitMap[randomUnitKey].toString(),
		positionId: positionIds[randomPositionIndex],
		firstName,
		lastName,
		fullName,
		email,
		phone: `+628${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
		gender,
		dateOfBirth,
		employmentType,
		employmentStatus: 'active',
		joinDate,
		probationEndDate,
		endDate,
		workLocation: randomChoice(locations),
		region: randomChoice(regions),
		customProperties: customProps,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

/**
 * Seed employees with bulk generation and unique email validation
 */
export async function seedEmployees(
	db: Db,
	options: EmployeeGeneratorOptions & { clear?: boolean }
) {
	console.log(`👥 Seeding ${options.count} employees...`);

	if (options.clear) {
		await db.collection('employees').deleteMany({});
	}

	// Track used emails to ensure uniqueness
	const usedEmails = new Set<string>();

	// If not clearing, load existing emails
	if (!options.clear) {
		const existingEmployees = await db.collection('employees').find({}, { projection: { email: 1 } }).toArray();
		existingEmployees.forEach(emp => {
			if (emp.email) usedEmails.add(emp.email);
		});
		console.log(`   Found ${usedEmails.size} existing emails`);
	}

	const batchSize = 100;
	let created = 0;

	for (let i = 0; i < options.count; i += batchSize) {
		const batch: Partial<Employee>[] = [];
		const currentBatchSize = Math.min(batchSize, options.count - i);

		for (let j = 0; j < currentBatchSize; j++) {
			batch.push(generateEmployeeData(
				i + j,
				options.organizationId,
				options.unitMap,
				options.positionIds,
				usedEmails
			));
		}

		await db.collection('employees').insertMany(batch);
		created += batch.length;

		// Show progress every 500 employees
		if (created % 500 === 0 || created === options.count) {
			console.log(`   Progress: ${created}/${options.count} employees created (${usedEmails.size} unique emails)`);
		}
	}

	console.log(`✅ Created ${created} employees with ${usedEmails.size} unique emails`);
	return created;
}

// CLI support
if (import.meta.main) {
	const { connectDB, disconnectDB } = await import('../connection');
	try {
		const db = await connectDB();

		// Get IAS organization
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			throw new Error('⚠️  IAS organization not found. Run organizations seeder first: bun run seed:organizations');
		}

		// Get org units
		const orgUnits = await db.collection('org_units').find({ organizationId: ias._id.toString() }).toArray();
		if (orgUnits.length === 0) {
			throw new Error('⚠️  No org units found. Run org-units seeder first: bun run seed:org-units');
		}

		// Get positions
		const positions = await db.collection('positions').find({ organizationId: ias._id.toString() }).toArray();
		if (positions.length === 0) {
			throw new Error('⚠️  No positions found. Run positions seeder first: bun run seed:positions');
		}

		// Build unit map
		const unitMap: Record<string, any> = {};
		for (const unit of orgUnits) {
			unitMap[unit.code] = unit._id;
		}

		console.log(`📊 Found ${orgUnits.length} org units and ${positions.length} positions`);

		// Seed 1500 employees
		await seedEmployees(db, {
			count: 1500,
			organizationId: ias._id.toString(),
			unitMap,
			positionIds: positions.map(p => p._id.toString()),
			clear: true
		});

	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	} finally {
		await disconnectDB();
	}
}
