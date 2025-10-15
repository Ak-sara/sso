import { connectDB, disconnectDB } from './connection';
import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import type {
	User,
	OAuthClient,
	Organization,
	OrgUnit,
	Position,
	Employee,
	Partner
} from './schemas';

async function seed() {
	console.log('🌱 Starting database seeding...');

	try {
		const db = await connectDB();

		// Clear existing data
		console.log('🗑️  Clearing existing collections...');
		await db.collection('users').deleteMany({});
		await db.collection('oauth_clients').deleteMany({});
		await db.collection('organizations').deleteMany({});
		await db.collection('org_units').deleteMany({});
		await db.collection('positions').deleteMany({});
		await db.collection('employees').deleteMany({});
		await db.collection('partners').deleteMany({});

		// ============== Organizations ==============
		console.log('📦 Creating organizations...');

		const injourney: Partial<Organization> = {
			code: 'INJ',
			name: 'Injourney',
			legalName: 'PT Injourney',
			type: 'parent',
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		const injResult = await db.collection('organizations').insertOne(injourney);
		const injId = injResult.insertedId.toString();

		const ias: Partial<Organization> = {
			code: 'IAS',
			name: 'Injourney Aviation Service',
			legalName: 'PT Injourney Aviation Service',
			type: 'subsidiary',
			parentId: injId,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		const iasResult = await db.collection('organizations').insertOne(ias);
		const iasId = iasResult.insertedId.toString();

		// IAS Subsidiaries
		const subsidiaries = [
			{ code: 'IASS', name: 'IAS Support', parentId: iasId },
			{ code: 'IASG', name: 'IAS Ground Handling', parentId: iasId },
			{ code: 'IASP', name: 'IAS Property', parentId: iasId },
			{ code: 'IASH', name: 'IAS Hospitality', parentId: iasId },
		];

		const subsidiaryIds: Record<string, string> = {};
		for (const sub of subsidiaries) {
			const result = await db.collection('organizations').insertOne({
				code: sub.code,
				name: sub.name,
				legalName: `PT ${sub.name}`,
				type: 'subsidiary',
				parentId: sub.parentId,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			subsidiaryIds[sub.code] = result.insertedId.toString();
		}

		console.log(`✅ Created ${1 + 1 + subsidiaries.length} organizations`);

		// ============== Organizational Units (IAS Structure) ==============
		console.log('🏢 Creating organizational units with hierarchy...');

		// We need to insert in order because of parent-child relationships
		const unitMap: Record<string, any> = {};

		// Level 0: Board of Directors
		const bod = await db.collection('org_units').insertOne({
			code: 'BOD',
			name: 'Board of Directors',
			shortName: 'BOD',
			type: 'board',
			organizationId: iasId,
			level: 0,
			sortOrder: 0,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['BOD'] = bod.insertedId;

		// Level 1: Directors (report to BOD)
		const directors = [
			{ code: 'DU', name: 'Direktur Utama', parentId: unitMap['BOD'] },
			{ code: 'DC', name: 'Direktur Komersial', parentId: unitMap['BOD'] },
			{ code: 'DO', name: 'Direktur Operasi', parentId: unitMap['BOD'] },
			{ code: 'DR', name: 'Direktur Resiko', parentId: unitMap['BOD'] },
			{ code: 'DK', name: 'Direktur Keuangan', parentId: unitMap['BOD'] },
			{ code: 'DH', name: 'Direktur SDM', parentId: unitMap['BOD'] }
		];

		for (const [i, dir] of directors.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: dir.code,
				name: dir.name,
				shortName: dir.code,
				type: 'directorate',
				organizationId: iasId,
				parentId: dir.parentId,
				level: 1,
				sortOrder: i + 1,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[dir.code] = result.insertedId;
		}

		// Level 2: Under Direktur Utama - DDB (Direktorat Dukungan Bisnis)
		const ddb = await db.collection('org_units').insertOne({
			code: 'DDB',
			name: 'Direktorat Dukungan Bisnis',
			shortName: 'DDB',
			type: 'directorate',
			organizationId: iasId,
			parentId: unitMap['DU'],
			level: 2,
			sortOrder: 10,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['DDB'] = ddb.insertedId;

		// Level 3: Under DDB - Divisions
		const ddbDivisions = [
			{ code: 'IA', name: 'Internal Audit', parentId: unitMap['DDB'] },
			{ code: 'CS', name: 'Corporate Secretary', parentId: unitMap['DDB'] },
			{ code: 'CST', name: 'Corporate Strategy', parentId: unitMap['DDB'] }
		];

		for (const [i, div] of ddbDivisions.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: div.code,
				name: div.name,
				shortName: div.code,
				type: 'division',
				organizationId: iasId,
				parentId: div.parentId,
				level: 3,
				sortOrder: 11 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[div.code] = result.insertedId;
		}

		// Level 2: SBU Cargo & Logistics (under BOD, linked to DC)
		const sbucl = await db.collection('org_units').insertOne({
			code: 'SBUCL',
			name: 'SBU Cargo & Logistics',
			shortName: 'SBUCL',
			type: 'sbu',
			organizationId: iasId,
			parentId: unitMap['BOD'],
			level: 2,
			sortOrder: 20,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['SBUCL'] = sbucl.insertedId;

		// Level 3: Under SBUCL - Main segments
		const sbuclSegments = [
			{ code: 'SCS', name: 'Cargo Service', parentId: unitMap['SBUCL'] },
			{ code: 'LOG', name: 'Logistics', parentId: unitMap['SBUCL'] },
			{ code: 'CBE', name: 'Commercial & Business Excellence', parentId: unitMap['SBUCL'] },
			{ code: 'CLS', name: 'Cargo & Logistics Supports', parentId: unitMap['SBUCL'] }
		];

		for (const [i, seg] of sbuclSegments.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: seg.code,
				name: seg.name,
				shortName: seg.code,
				type: 'division',
				organizationId: iasId,
				parentId: seg.parentId,
				level: 3,
				sortOrder: 21 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[seg.code] = result.insertedId;
		}

		// Level 4: Under Cargo Service - Subdivisions
		const cargoServiceUnits = [
			{ code: 'CGSL', name: 'Sales', parentId: unitMap['SCS'] },
			{ code: 'CI', name: 'Cargo Improvement', parentId: unitMap['SCS'] },
			{ code: 'RA', name: 'Regulated Agent', parentId: unitMap['SCS'] }
		];

		for (const [i, unit] of cargoServiceUnits.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 4,
				sortOrder: 25 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = result.insertedId;
		}

		// Cargo Operations with regional stations
		const gmco = await db.collection('org_units').insertOne({
			code: 'GMCO',
			name: 'Cargo Operation',
			shortName: 'GMCO',
			type: 'department',
			organizationId: iasId,
			parentId: unitMap['SCS'],
			level: 4,
			sortOrder: 28,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['GMCO'] = gmco.insertedId;

		// Regional stations under Cargo Operation
		const regionalStations = [
			{ code: 'KNO', name: 'Regional Station KNO', parentId: unitMap['GMCO'] },
			{ code: 'CGK', name: 'Regional Station CGK', parentId: unitMap['GMCO'] },
			{ code: 'DPS', name: 'Regional Station DPS', parentId: unitMap['GMCO'] },
			{ code: 'UPG', name: 'Regional Station UPG', parentId: unitMap['GMCO'] }
		];

		for (const [i, station] of regionalStations.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: station.code,
				name: station.name,
				shortName: station.code,
				type: 'section',
				organizationId: iasId,
				parentId: station.parentId,
				level: 5,
				sortOrder: 29 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[station.code] = result.insertedId;
		}

		// Level 4: Under Logistics - Business units
		const logisticsUnits = [
			{ code: 'AE', name: 'Air Express', parentId: unitMap['LOG'] },
			{ code: 'FF', name: 'Freight Forwarder', parentId: unitMap['LOG'] },
			{ code: 'BSS', name: 'Baggage Service Solutions', parentId: unitMap['LOG'] },
			{ code: 'CL', name: 'Contract Logistics', parentId: unitMap['LOG'] }
		];

		for (const [i, unit] of logisticsUnits.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 4,
				sortOrder: 33 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = result.insertedId;
		}

		// Level 4: Under CBE - Functions
		const cbeUnits = [
			{ code: 'PQ', name: 'Policy and QHSE', parentId: unitMap['CBE'] },
			{ code: 'KS', name: 'Key Account and Solutions', parentId: unitMap['CBE'] },
			{ code: 'BIP', name: 'Business Intelligence and Performance', parentId: unitMap['CBE'] },
			{ code: 'PO', name: 'Procurement Outbound', parentId: unitMap['CBE'] }
		];

		for (const [i, unit] of cbeUnits.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 4,
				sortOrder: 37 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = result.insertedId;
		}

		// Level 4: Under CLS - Support functions
		const clsUnits = [
			{ code: 'SAF', name: 'Accounting & Finance', parentId: unitMap['CLS'] },
			{ code: 'SHL', name: 'HC and Legal', parentId: unitMap['CLS'] },
			{ code: 'SFS', name: 'Facility and System', parentId: unitMap['CLS'] }
		];

		for (const [i, unit] of clsUnits.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 4,
				sortOrder: 41 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = result.insertedId;
		}

		// Level 2-3: Under Direktur Komersial
		const ddcDivisions = [
			{ code: 'CD', name: 'Commercial Development', parentId: unitMap['DC'] },
			{ code: 'SSM', name: 'Strategic Sales Marketing', parentId: unitMap['DC'] },
			{ code: 'BPS', name: 'Business Performance and Strategy', parentId: unitMap['DC'] }
		];

		for (const [i, div] of ddcDivisions.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: div.code,
				name: div.name,
				shortName: div.code,
				type: 'division',
				organizationId: iasId,
				parentId: div.parentId,
				level: 2,
				sortOrder: 50 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[div.code] = result.insertedId;
		}

		// Level 2-3: Under Direktur Operasi
		const ddoDivisions = [
			{ code: 'OPS', name: 'Operation Excellence & Standarization', parentId: unitMap['DO'] },
			{ code: 'CX', name: 'Customer Experience', parentId: unitMap['DO'] },
			{ code: 'BP', name: 'Business Portfolio', parentId: unitMap['DO'] },
			{ code: 'SAS', name: 'SDU: Aviation Service', parentId: unitMap['DO'] },
			{ code: 'SFM', name: 'SDU: Facility Management & Manpower Service', parentId: unitMap['DO'] },
			{ code: 'SHO', name: 'SDU: Hospitality', parentId: unitMap['DO'] }
		];

		for (const [i, div] of ddoDivisions.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: div.code,
				name: div.name,
				shortName: div.code,
				type: 'division',
				organizationId: iasId,
				parentId: div.parentId,
				level: 2,
				sortOrder: 60 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[div.code] = result.insertedId;
		}

		// Level 2-3: Under Direktur Keuangan
		const ddkDivisions = [
			{ code: 'CF', name: 'Corporate Finance', parentId: unitMap['DK'] },
			{ code: 'SPM', name: 'Strategic Performance Management', parentId: unitMap['DK'] },
			{ code: 'ACC', name: 'Accounting', parentId: unitMap['DK'] },
			{ code: 'SAM', name: 'SDU: Assets Management', parentId: unitMap['DK'] },
			{ code: 'SERP', name: 'SDU: ERP', parentId: unitMap['DK'] }
		];

		for (const [i, div] of ddkDivisions.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: div.code,
				name: div.name,
				shortName: div.code,
				type: 'division',
				organizationId: iasId,
				parentId: div.parentId,
				level: 2,
				sortOrder: 70 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[div.code] = result.insertedId;
		}

		// Level 2-3: Under Direktur SDM
		const ddhDivisions = [
			{ code: 'HS', name: 'HC Strategy and Planning', parentId: unitMap['DH'] },
			{ code: 'HB', name: 'HC BP and Talent', parentId: unitMap['DH'] },
			{ code: 'HG', name: 'HC Service and GA', parentId: unitMap['DH'] },
			{ code: 'IT', name: 'Information Technology', parentId: unitMap['DH'] },
			{ code: 'SACA', name: 'SDU: IAS Academy', parentId: unitMap['DH'] }
		];

		for (const [i, div] of ddhDivisions.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: div.code,
				name: div.name,
				shortName: div.code,
				type: 'division',
				organizationId: iasId,
				parentId: div.parentId,
				level: 2,
				sortOrder: 80 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[div.code] = result.insertedId;
		}

		// Level 2-3: Under Direktur Resiko
		const ddrDivisions = [
			{ code: 'RM', name: 'Risk Management, Governance and Compliance', parentId: unitMap['DR'] },
			{ code: 'LG', name: 'Legal', parentId: unitMap['DR'] },
			{ code: 'PC', name: 'Procurement', parentId: unitMap['DR'] }
		];

		for (const [i, div] of ddrDivisions.entries()) {
			const result = await db.collection('org_units').insertOne({
				code: div.code,
				name: div.name,
				shortName: div.code,
				type: 'division',
				organizationId: iasId,
				parentId: div.parentId,
				level: 2,
				sortOrder: 90 + i,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[div.code] = result.insertedId;
		}

		const totalUnits = Object.keys(unitMap).length;
		console.log(`✅ Created ${totalUnits} organizational units with proper hierarchy`);

		// ============== Positions ==============
		console.log('💼 Creating positions...');

		const positions: Partial<Position>[] = [
			{ code: 'DIR', name: 'Direktur', level: 'executive', grade: 'E1', organizationId: iasId },
			{ code: 'GM', name: 'General Manager', level: 'senior', grade: 'S1', organizationId: iasId },
			{ code: 'MGR', name: 'Manager', level: 'middle', grade: 'M1', organizationId: iasId },
			{ code: 'SPV', name: 'Supervisor', level: 'middle', grade: 'M2', organizationId: iasId },
			{ code: 'STA', name: 'Staff', level: 'staff', grade: 'J1', organizationId: iasId },
			{ code: 'SSTA', name: 'Senior Staff', level: 'junior', grade: 'J2', organizationId: iasId },
		];

		const positionResults = await db.collection('positions').insertMany(positions);
		const positionIds = Object.values(positionResults.insertedIds).map(id => id.toString());

		console.log(`✅ Created ${positions.length} positions`);

		// ============== Users & Employees ==============
		console.log('👤 Creating users and employees...');

		const hashedPassword = await hash('password123');

		// Admin user
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
		const adminResult = await db.collection('users').insertOne(adminUser);

		// Sample employees with proper org unit assignments
		const employees: Partial<Employee>[] = [
			{
				employeeId: 'IAS-001',
				userId: adminResult.insertedId.toString(),
				organizationId: iasId,
				orgUnitId: unitMap['DU'].toString(), // Direktur Utama
				positionId: positionIds[0], // Director
				firstName: 'Budi',
				lastName: 'Santoso',
				fullName: 'Budi Santoso',
				email: 'budi.santoso@ias.co.id',
				phone: '+6281234567890',
				gender: 'male',
				dateOfBirth: new Date('1975-05-15'),
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: new Date('2015-01-15'),
				workLocation: 'Jakarta',
				region: 'Pusat',
				customProperties: {
					employmentType: 'Permanent',
					division: 'Executive'
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				employeeId: 'IAS-002',
				organizationId: iasId,
				orgUnitId: unitMap['HS'].toString(), // HC Strategy and Planning
				positionId: positionIds[1], // General Manager
				firstName: 'Siti',
				lastName: 'Nurhaliza',
				fullName: 'Siti Nurhaliza',
				email: 'siti.nurhaliza@ias.co.id',
				phone: '+6281234567891',
				gender: 'female',
				dateOfBirth: new Date('1985-03-20'),
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: new Date('2019-03-20'),
				workLocation: 'Jakarta',
				region: 'Pusat',
				customProperties: {
					employmentType: 'Permanent'
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				employeeId: 'IAS-003',
				organizationId: iasId,
				orgUnitId: unitMap['CGSL'].toString(), // Cargo Sales
				positionId: positionIds[2], // Manager
				firstName: 'Ahmad',
				lastName: 'Wijaya',
				fullName: 'Ahmad Wijaya',
				email: 'ahmad.wijaya@ias.co.id',
				phone: '+6281234567892',
				gender: 'male',
				dateOfBirth: new Date('1990-06-01'),
				employmentType: 'PKWT',
				employmentStatus: 'active',
				joinDate: new Date('2023-06-01'),
				probationEndDate: new Date('2023-09-01'),
				endDate: new Date('2025-06-01'),
				workLocation: 'CGK',
				region: 'Regional 2',
				customProperties: {
					employmentType: 'PKWT',
					contractEndDate: '2025-06-01'
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				employeeId: 'IAS-004',
				organizationId: iasId,
				orgUnitId: unitMap['KNO'].toString(), // Regional Station KNO
				positionId: positionIds[3], // Supervisor
				firstName: 'Dewi',
				lastName: 'Lestari',
				fullName: 'Dewi Lestari',
				email: 'dewi.lestari@ias.co.id',
				phone: '+6281234567893',
				gender: 'female',
				dateOfBirth: new Date('1992-01-10'),
				employmentType: 'OS',
				employmentStatus: 'active',
				joinDate: new Date('2023-01-10'),
				workLocation: 'KNO',
				region: 'Regional 1',
				customProperties: {
					employmentType: 'OS',
					vendor: 'PT Outsourcing Partner'
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				employeeId: 'IAS-005',
				organizationId: iasId,
				orgUnitId: unitMap['CGK'].toString(), // Regional Station CGK
				positionId: positionIds[4], // Staff
				firstName: 'Rina',
				lastName: 'Susanti',
				fullName: 'Rina Susanti',
				email: 'rina.susanti@ias.co.id',
				phone: '+6281234567894',
				gender: 'female',
				dateOfBirth: new Date('1995-08-12'),
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: new Date('2022-02-01'),
				probationEndDate: new Date('2022-05-01'),
				workLocation: 'CGK',
				region: 'Regional 2',
				customProperties: {
					employmentType: 'Permanent'
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				employeeId: 'IAS-006',
				organizationId: iasId,
				orgUnitId: unitMap['IT'].toString(), // Information Technology
				positionId: positionIds[5], // Senior Staff
				firstName: 'Rudi',
				lastName: 'Hermawan',
				fullName: 'Rudi Hermawan',
				email: 'rudi.hermawan@ias.co.id',
				phone: '+6281234567895',
				gender: 'male',
				dateOfBirth: new Date('1988-11-22'),
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: new Date('2018-07-15'),
				workLocation: 'Jakarta',
				region: 'Pusat',
				customProperties: {
					employmentType: 'Permanent',
					specialization: 'System Administrator'
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				employeeId: 'IAS-007',
				organizationId: iasId,
				orgUnitId: unitMap['ACC'].toString(), // Accounting
				positionId: positionIds[2], // Manager
				firstName: 'Lisa',
				lastName: 'Anggraini',
				fullName: 'Lisa Anggraini',
				email: 'lisa.anggraini@ias.co.id',
				phone: '+6281234567896',
				gender: 'female',
				dateOfBirth: new Date('1987-04-18'),
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: new Date('2017-09-01'),
				workLocation: 'Jakarta',
				region: 'Pusat',
				customProperties: {
					employmentType: 'Permanent',
					certification: 'CPA'
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				employeeId: 'IAS-008',
				organizationId: iasId,
				orgUnitId: unitMap['DPS'].toString(), // Regional Station DPS
				positionId: positionIds[4], // Staff
				firstName: 'Made',
				lastName: 'Sudana',
				fullName: 'Made Sudana',
				email: 'made.sudana@ias.co.id',
				phone: '+6281234567897',
				gender: 'male',
				dateOfBirth: new Date('1993-07-08'),
				employmentType: 'PKWT',
				employmentStatus: 'active',
				joinDate: new Date('2024-01-15'),
				probationEndDate: new Date('2024-04-15'),
				endDate: new Date('2026-01-15'),
				workLocation: 'DPS',
				region: 'Regional 3',
				customProperties: {
					employmentType: 'PKWT',
					contractEndDate: '2026-01-15'
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			}
		];

		await db.collection('employees').insertMany(employees);

		// Create users for some employees
		const userEmployees = [
			{
				email: 'siti.nurhaliza@ias.co.id',
				username: 'siti.nurhaliza',
				firstName: 'Siti',
				lastName: 'Nurhaliza',
				employeeId: 'IAS-002'
			},
			{
				email: 'ahmad.wijaya@ias.co.id',
				username: 'ahmad.wijaya',
				firstName: 'Ahmad',
				lastName: 'Wijaya',
				employeeId: 'IAS-003'
			}
		];

		for (const emp of userEmployees) {
			const user: Partial<User> = {
				email: emp.email,
				username: emp.username,
				password: hashedPassword,
				firstName: emp.firstName,
				lastName: emp.lastName,
				isActive: true,
				emailVerified: true,
				roles: ['user'],
				organizationId: iasId,
				employeeId: emp.employeeId,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			await db.collection('users').insertOne(user);
		}

		console.log(`✅ Created ${1 + userEmployees.length} users and ${employees.length} employees`);

		// ============== Partners ==============
		console.log('🤝 Creating partners...');

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

		// ============== OAuth Clients ==============
		console.log('🔐 Creating OAuth clients...');

		const clients: Partial<OAuthClient>[] = [
			{
				clientId: 'test-client',
				clientSecret: await hash('test-secret'),
				clientName: 'Test Application',
				redirectUris: ['http://localhost:3000/callback', 'http://localhost:3000/auth/callback'],
				allowedScopes: ['openid', 'profile', 'email', 'employees', 'organizations'],
				grantTypes: ['authorization_code', 'refresh_token'],
				isActive: true,
				organizationId: iasId,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				clientId: 'hr-system',
				clientSecret: await hash('hr-secret-key'),
				clientName: 'HR Management System',
				redirectUris: ['https://hr.ias.co.id/auth/callback'],
				allowedScopes: ['openid', 'profile', 'email', 'employees', 'organizations'],
				grantTypes: ['authorization_code', 'refresh_token'],
				isActive: true,
				organizationId: iasId,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		];

		await db.collection('oauth_clients').insertMany(clients);

		console.log(`✅ Created ${clients.length} OAuth clients`);

		// ============== Create indexes ==============
		console.log('📇 Creating database indexes...');

		await db.collection('users').createIndex({ email: 1 }, { unique: true });
		await db.collection('users').createIndex({ username: 1 }, { unique: true });
		await db.collection('oauth_clients').createIndex({ clientId: 1 }, { unique: true });
		await db.collection('employees').createIndex({ employeeId: 1 }, { unique: true });
		await db.collection('employees').createIndex({ organizationId: 1 });
		await db.collection('employees').createIndex({ email: 1 });
		await db.collection('organizations').createIndex({ code: 1 }, { unique: true });
		await db.collection('org_units').createIndex({ code: 1, organizationId: 1 }, { unique: true });
		await db.collection('partners').createIndex({ partnerId: 1 }, { unique: true });

		console.log('✅ Created database indexes');

		console.log('\n✨ Seeding completed successfully!');
		console.log('\n📊 Summary:');
		console.log(`   Organizations: ${1 + 1 + subsidiaries.length}`);
		console.log(`   Organizational Units: ${totalUnits}`);
		console.log(`   Positions: ${positions.length}`);
		console.log(`   Users: ${1 + userEmployees.length}`);
		console.log(`   Employees: ${employees.length}`);
		console.log(`   Partners: ${partners.length}`);
		console.log(`   OAuth Clients: ${clients.length}`);
		console.log('\n🔑 Login credentials:');
		console.log('   Email: admin@ias.co.id');
		console.log('   Password: password123');
		console.log('\n🔐 OAuth Client for testing:');
		console.log('   Client ID: test-client');
		console.log('   Client Secret: test-secret');

	} catch (error) {
		console.error('❌ Seeding failed:', error);
		throw error;
	} finally {
		await disconnectDB();
	}
}

// Run seed if called directly
if (import.meta.main) {
	seed().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

export { seed };
