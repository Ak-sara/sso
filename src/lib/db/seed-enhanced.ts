import { connectDB, disconnectDB } from './connection';
import { hash } from 'argon2';
import type {
	User,
	OAuthClient,
	Organization,
	OrgUnit,
	Position,
	Employee,
	Partner,
	OrgStructureVersion
} from './schemas';
import { generateMermaidDiagram } from '$lib/utils/mermaid-generator';

// Helper to generate random Indonesian names
const firstNamesMale = ['Ahmad', 'Budi', 'Candra', 'Dedi', 'Eko', 'Fajar', 'Gunawan', 'Hadi', 'Indra', 'Joko', 'Kurniawan', 'Lukman', 'Made', 'Nugroho', 'Oki', 'Pandu', 'Rudi', 'Surya', 'Toni', 'Usman', 'Wawan', 'Yudi', 'Zaki'];
const firstNamesFemale = ['Ani', 'Bella', 'Citra', 'Dewi', 'Eka', 'Fitri', 'Gita', 'Hani', 'Indah', 'Julia', 'Kartika', 'Lisa', 'Maya', 'Nina', 'Oki', 'Putri', 'Rina', 'Sari', 'Tuti', 'Umi', 'Wati', 'Yanti', 'Zahra'];
const lastNames = ['Santoso', 'Wijaya', 'Kusuma', 'Pratama', 'Nugraha', 'Sutanto', 'Hermawan', 'Setiawan', 'Putra', 'Lestari', 'Anggraini', 'Susanti', 'Wibowo', 'Hidayat', 'Rahman', 'Suharto', 'Purnomo', 'Suryanto', 'Handoko', 'Hartono'];

function generateName(gender: 'male' | 'female'): { firstName: string, lastName: string, fullName: string } {
	const firstName = gender === 'male'
		? firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)]
		: firstNamesFemale[Math.floor(Math.random() * firstNamesFemale.length)];
	const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
	return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function generateEmail(firstName: string, lastName: string, domain: string = 'ias.co.id'): string {
	return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generatePhone(): string {
	const prefix = ['+6281', '+6282', '+6285', '+6287', '+6288'];
	return prefix[Math.floor(Math.random() * prefix.length)] + Math.floor(10000000 + Math.random() * 90000000);
}

function randomDate(start: Date, end: Date): Date {
	return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedEnhanced() {
	console.log('🌱 Starting ENHANCED database seeding...');

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
		await db.collection('org_structure_versions').deleteMany({});

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

		// Injourney siblings
		const injSiblings = [
			{ code: 'TWC', name: 'Taman Wisata Candi' },
			{ code: 'ITDC', name: 'Tourism Destination' },
			{ code: 'HIN', name: 'Hotel Indonesia Natour' },
			{ code: 'IR', name: 'Sarinah' },
			{ code: 'API', name: 'Angkasa Pura Indonesia' }
		];

		for (const sibling of injSiblings) {
			await db.collection('organizations').insertOne({
				code: sibling.code,
				name: sibling.name,
				legalName: `PT ${sibling.name}`,
				type: 'subsidiary',
				parentId: injId,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

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

		console.log(`✅ Created ${1 + injSiblings.length + 1 + subsidiaries.length} organizations`);

		// ============== COMPREHENSIVE IAS Organizational Units ==============
		console.log('🏢 Creating COMPREHENSIVE organizational units (100+ units)...');

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
			{ code: 'DH', name: 'Direktur Human Capital', parentId: unitMap['BOD'] }
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

		// ========== Direktorat Dukungan Bisnis (Under DU) ==========
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

		// Band 1 units under DDB
		const ddbBand1 = [
			{ code: 'IA', name: 'Internal Audit' },
			{ code: 'CS', name: 'Corporate Secretary' },
			{ code: 'CST', name: 'Corporate Strategy' }
		];

		for (const unit of ddbBand1) {
			const result = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DDB'],
				level: 3,
				sortOrder: 11,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = result.insertedId;
		}

		// Band 2 subdivisions under IA
		const iaBand2 = [
			{ code: 'BOA', name: 'Business & Operation Audit', parentId: unitMap['IA'] },
			{ code: 'FEA', name: 'Finance & Enabler Audit', parentId: unitMap['IA'] }
		];
		for (const unit of iaBand2) {
			const result = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 4,
				sortOrder: 100,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = result.insertedId;
		}

		// Band 2 subdivisions under CS
		const csBand2 = [
			{ code: 'BSCA', name: 'Board Support & Corporate Admin', parentId: unitMap['CS'] },
			{ code: 'CCSR', name: 'Corp Comm & Stakeholder Relation', parentId: unitMap['CS'] },
			{ code: 'CORSUS', name: 'Corporate Sustainability', parentId: unitMap['CS'] }
		];
		for (const unit of csBand2) {
			const result = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 4,
				sortOrder: 101,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = result.insertedId;
		}

		// Band 2 subdivisions under CST
		const cstBand2 = [
			{ code: 'CPD', name: 'Corporate Planning & Development', parentId: unitMap['CST'] },
			{ code: 'CORT', name: 'Corporate Transformation', parentId: unitMap['CST'] }
		];
		for (const unit of cstBand2) {
			const result = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 4,
				sortOrder: 102,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = result.insertedId;
		}

		// SDU under DDB
		const result = await db.collection('org_units').insertOne({
			code: 'SPMO',
			name: 'SDU PMO',
			shortName: 'SPMO',
			type: 'division',
			organizationId: iasId,
			parentId: unitMap['DDB'],
			level: 3,
			sortOrder: 103,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['SPMO'] = result.insertedId;

		// ========== Direktorat Komersial (DC) ==========
		const dcBand1 = [
			{ code: 'CD', name: 'Commercial Development' },
			{ code: 'SSM', name: 'Strategic Sales & Marketing' },
			{ code: 'BPS', name: 'Business Performance and Strategy' }
		];

		for (const unit of dcBand1) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DC'],
				level: 2,
				sortOrder: 20,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under CD
		const cdBand2 = [
			{ code: 'CDBD', name: 'Business Development', parentId: unitMap['CD'] },
			{ code: 'CDCP', name: 'Commercial Partnership', parentId: unitMap['CD'] }
		];
		for (const unit of cdBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 200,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under SSM
		const ssmBand2 = [
			{ code: 'SMMC', name: 'Marketing Communication', parentId: unitMap['SSM'] },
			{ code: 'SMIS', name: 'Integrated Sales', parentId: unitMap['SSM'] }
		];
		for (const unit of ssmBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 201,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under BPS
		const bpsBand2 = [
			{ code: 'BPPS', name: 'Performance & Strategy', parentId: unitMap['BPS'] },
			{ code: 'BPAM', name: 'Account Management', parentId: unitMap['BPS'] }
		];
		for (const unit of bpsBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 202,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// ========== SBU Cargo & Logistics (SBUCL) ==========
		const sbucl = await db.collection('org_units').insertOne({
			code: 'SBUCL',
			name: 'SBU Cargo & Logistics',
			shortName: 'SBUCL',
			type: 'sbu',
			organizationId: iasId,
			parentId: unitMap['BOD'],
			level: 2,
			sortOrder: 30,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['SBUCL'] = sbucl.insertedId;

		// SEGM (Cargo & Logistics segment marker - not actual unit)
		const segmRes = await db.collection('org_units').insertOne({
			code: 'SEGM',
			name: 'Cargo & Logistics',
			shortName: 'SEGM',
			type: 'division',
			organizationId: iasId,
			parentId: unitMap['SBUCL'],
			level: 3,
			sortOrder: 31,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['SEGM'] = segmRes.insertedId;

		// Band 1 units under SEGM
		const segmBand1 = [
			{ code: 'SCS', name: 'Cargo Service' },
			{ code: 'LOG', name: 'Logistics' },
			{ code: 'CBE', name: 'Commercial & Business Excellence' },
			{ code: 'CLS', name: 'Cargo & Logistics Supports' }
		];

		for (const unit of segmBand1) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['SEGM'],
				level: 4,
				sortOrder: 40,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under SCS (Cargo Service)
		const gmcs = await db.collection('org_units').insertOne({
			code: 'GMCS',
			name: 'Cargo Service',
			shortName: 'GMCS',
			type: 'department',
			organizationId: iasId,
			parentId: unitMap['SCS'],
			level: 5,
			sortOrder: 50,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['GMCS'] = gmcs.insertedId;

		const scsBand2 = [
			{ code: 'CGSL', name: 'Sales', parentId: unitMap['GMCS'] },
			{ code: 'CI', name: 'Cargo Improvement', parentId: unitMap['GMCS'] },
			{ code: 'RA', name: 'Regulated Agent', parentId: unitMap['GMCS'] }
		];
		for (const unit of scsBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'section',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 6,
				sortOrder: 51,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Cargo Operation
		const gmco = await db.collection('org_units').insertOne({
			code: 'GMCO',
			name: 'Cargo Operation',
			shortName: 'GMCO',
			type: 'department',
			organizationId: iasId,
			parentId: unitMap['SCS'],
			level: 5,
			sortOrder: 52,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		unitMap['GMCO'] = gmco.insertedId;

		// Regional stations under GMCO
		const regionalStations = [
			{ code: 'KNO', name: 'Regional Station KNO' },
			{ code: 'CGK', name: 'Regional Station CGK' },
			{ code: 'DPS', name: 'Regional Station DPS' },
			{ code: 'UPG', name: 'Regional Station UPG' }
		];
		for (const station of regionalStations) {
			const res = await db.collection('org_units').insertOne({
				code: station.code,
				name: station.name,
				shortName: station.code,
				type: 'section',
				organizationId: iasId,
				parentId: unitMap['GMCO'],
				level: 6,
				sortOrder: 53,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[station.code] = res.insertedId;
		}

		// Band 2 under LOG (Logistics)
		const logBand1Groups = [
			{ code: 'GMAE', name: 'Air Express' },
			{ code: 'GMFF', name: 'Freight Forwarder' },
			{ code: 'GMBSS', name: 'Baggage Service Solutions' },
			{ code: 'GMCL', name: 'Contract Logistics' }
		];
		for (const group of logBand1Groups) {
			const res = await db.collection('org_units').insertOne({
				code: group.code,
				name: group.name,
				shortName: group.code,
				type: 'department',
				organizationId: iasId,
				parentId: unitMap['LOG'],
				level: 5,
				sortOrder: 60,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[group.code] = res.insertedId;
		}

		// Sub-departments under each logistics group
		const aeBand2 = [
			{ code: 'AESL', name: 'Sales', parentId: unitMap['GMAE'] },
			{ code: 'AEOP', name: 'Operation', parentId: unitMap['GMAE'] },
			{ code: 'AEPC', name: 'Route Development', parentId: unitMap['GMAE'] }
		];
		const ffBand2 = [
			{ code: 'FFSL', name: 'Sales', parentId: unitMap['GMFF'] },
			{ code: 'FFOP', name: 'Operation', parentId: unitMap['GMFF'] },
			{ code: 'FFPC', name: 'Project Control', parentId: unitMap['GMFF'] }
		];
		const bssBand2 = [
			{ code: 'BSSSL', name: 'Sales', parentId: unitMap['GMBSS'] },
			{ code: 'BSSOP', name: 'Operation', parentId: unitMap['GMBSS'] }
		];
		const clBand2 = [
			{ code: 'CLSL', name: 'Sales', parentId: unitMap['GMCL'] },
			{ code: 'CLOP', name: 'Operation', parentId: unitMap['GMCL'] },
			{ code: 'CLDS', name: 'Design & Solution', parentId: unitMap['GMCL'] }
		];

		const allLogBand2 = [...aeBand2, ...ffBand2, ...bssBand2, ...clBand2];
		for (const unit of allLogBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'section',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 6,
				sortOrder: 61,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under CBE
		const cbeBand2 = [
			{ code: 'PQ', name: 'Policy and QHSE', parentId: unitMap['CBE'] },
			{ code: 'KS', name: 'Key Account and Solutions', parentId: unitMap['CBE'] },
			{ code: 'BIP', name: 'Business Intelligence and Performance', parentId: unitMap['CBE'] },
			{ code: 'PO', name: 'Procurement Outbound', parentId: unitMap['CBE'] }
		];
		for (const unit of cbeBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'section',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 5,
				sortOrder: 70,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under CLS
		const clsBand2 = [
			{ code: 'SAF', name: 'Accounting & Finance', parentId: unitMap['CLS'] },
			{ code: 'SHL', name: 'HC and Legal', parentId: unitMap['CLS'] },
			{ code: 'SFS', name: 'Facility and System', parentId: unitMap['CLS'] }
		];
		for (const unit of clsBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'section',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 5,
				sortOrder: 71,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// ========== Direktorat Operasi (DO) ==========
		const doBand1 = [
			{ code: 'OPS', name: 'Operation Excellence & Standarization' },
			{ code: 'CX', name: 'Customer Experience' },
			{ code: 'BP', name: 'Business Portfolio' }
		];
		for (const unit of doBand1) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DO'],
				level: 2,
				sortOrder: 80,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under OPS
		const opsBand2 = [
			{ code: 'OPOS', name: 'Operation & Standarization', parentId: unitMap['OPS'] },
			{ code: 'OPQA', name: 'Quality Assurance', parentId: unitMap['OPS'] },
			{ code: 'OPHSE', name: 'HSSE', parentId: unitMap['OPS'] }
		];
		for (const unit of opsBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 300,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under CX
		const cxBand2 = [
			{ code: 'CXPP', name: 'Customer Experience Planning & Policy', parentId: unitMap['CX'] },
			{ code: 'CXD', name: 'Customer Experience Delivery', parentId: unitMap['CX'] },
			{ code: 'CXIC', name: 'Customer Experience Insight & CRM', parentId: unitMap['CX'] }
		];
		for (const unit of cxBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 301,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under BP
		const bpBand2 = [
			{ code: 'BPT', name: 'Business Portfolio Transformation', parentId: unitMap['BP'] },
			{ code: 'BPMO', name: 'Business Portfolio Model Optimization', parentId: unitMap['BP'] }
		];
		for (const unit of bpBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 302,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// SDUs under DO
		const doSDUs = [
			{ code: 'SAS', name: 'SDU: Aviation Service' },
			{ code: 'SFM', name: 'SDU: Facility Management & Manpower Service' },
			{ code: 'SHO', name: 'SDU: Hospitality' }
		];
		for (const unit of doSDUs) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DO'],
				level: 2,
				sortOrder: 303,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// ========== Direktorat Keuangan (DK) ==========
		const dkBand1 = [
			{ code: 'CF', name: 'Corporate Finance' },
			{ code: 'SPM', name: 'Strategic Performance Management' },
			{ code: 'ACC', name: 'Accounting' }
		];
		for (const unit of dkBand1) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DK'],
				level: 2,
				sortOrder: 400,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under CF
		const cfBand2 = [
			{ code: 'CFM', name: 'Capital Management', parentId: unitMap['CF'] },
			{ code: 'CFF', name: 'Capital Financing', parentId: unitMap['CF'] },
			{ code: 'CFT', name: 'Treasury', parentId: unitMap['CF'] }
		];
		for (const unit of cfBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 401,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under SPM
		const spmBand2 = [
			{ code: 'CFSF', name: 'Strategy & Finance analysis', parentId: unitMap['SPM'] },
			{ code: 'CFPC', name: 'Performance & Cost analysis', parentId: unitMap['SPM'] },
			{ code: 'CFSP', name: 'Subsidiary Performance Management', parentId: unitMap['SPM'] }
		];
		for (const unit of spmBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 402,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under ACC
		const accBand2 = [
			{ code: 'CFAT', name: 'Accounting & Tax', parentId: unitMap['ACC'] },
			{ code: 'CFFR', name: 'Financial Reporting', parentId: unitMap['ACC'] }
		];
		for (const unit of accBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 403,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// SDUs under DK
		const dkSDUs = [
			{ code: 'SAM', name: 'SDU: Assets Management' },
			{ code: 'SERP', name: 'SDU: ERP' }
		];
		for (const unit of dkSDUs) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DK'],
				level: 2,
				sortOrder: 404,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// ========== Direktorat Human Capital (DH) ==========
		const dhBand1 = [
			{ code: 'HS', name: 'HC Strategy and Planning' },
			{ code: 'HB', name: 'HC BP and Talent' },
			{ code: 'HG', name: 'HC Service and GA' },
			{ code: 'IT', name: 'Information Technology' }
		];
		for (const unit of dhBand1) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DH'],
				level: 2,
				sortOrder: 500,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under HS
		const hsBand2 = [
			{ code: 'HCOC', name: 'Organization & Culture', parentId: unitMap['HS'] },
			{ code: 'HCPPE', name: 'Planning Policy & Evaluation', parentId: unitMap['HS'] }
		];
		for (const unit of hsBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 501,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under HB
		const hbBand2 = [
			{ code: 'HCBP', name: 'HC Business Partner', parentId: unitMap['HB'] },
			{ code: 'HCTD', name: 'HC Talent & Development', parentId: unitMap['HB'] }
		];
		for (const unit of hbBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 502,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under HG
		const hgBand2 = [
			{ code: 'HCS', name: 'HC Services', parentId: unitMap['HG'] },
			{ code: 'HCI', name: 'HC Industrial & Employee Relation', parentId: unitMap['HG'] },
			{ code: 'HCGA', name: 'General Affairs & Facility', parentId: unitMap['HG'] }
		];
		for (const unit of hgBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 503,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under IT
		const itBand2 = [
			{ code: 'ITSI', name: 'IT Strategy & Integration', parentId: unitMap['IT'] },
			{ code: 'ITDV', name: 'IT Development', parentId: unitMap['IT'] },
			{ code: 'ITOI', name: 'IT Operation & Infrastructure', parentId: unitMap['IT'] },
			{ code: 'ITCG', name: 'IT Cybersecurity Governance & Control', parentId: unitMap['IT'] }
		];
		for (const unit of itBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 504,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// SDU under DH
		const dhSDUs = [
			{ code: 'SACA', name: 'SDU: IAS Academy' }
		];
		for (const unit of dhSDUs) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DH'],
				level: 2,
				sortOrder: 505,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// ========== Direktorat Resiko (DR) ==========
		const drBand1 = [
			{ code: 'RM', name: 'Risk Management, Governance and Compliance' },
			{ code: 'LG', name: 'Legal' },
			{ code: 'PC', name: 'Procurement' }
		];
		for (const unit of drBand1) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'division',
				organizationId: iasId,
				parentId: unitMap['DR'],
				level: 2,
				sortOrder: 600,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under RM
		const rmBand2 = [
			{ code: 'RMCG', name: 'Corporate Governance & Policy', parentId: unitMap['RM'] },
			{ code: 'RMCA', name: 'Compliance & Assurance', parentId: unitMap['RM'] },
			{ code: 'RMSD', name: 'Risk Strategy & Development', parentId: unitMap['RM'] },
			{ code: 'RMAM', name: 'Risk Assessment & Monitoring', parentId: unitMap['RM'] }
		];
		for (const unit of rmBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 601,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under LG
		const lgBand2 = [
			{ code: 'CLG', name: 'Corporate Legal', parentId: unitMap['LG'] },
			{ code: 'BLG', name: 'Business Legal', parentId: unitMap['LG'] },
			{ code: 'LGA', name: 'Legal Aid', parentId: unitMap['LG'] }
		];
		for (const unit of lgBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 602,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		// Band 2 under PC
		const pcBand2 = [
			{ code: 'PCP', name: 'Procurement Planning', parentId: unitMap['PC'] },
			{ code: 'PCOV', name: 'Procurement Operation & Vendor', parentId: unitMap['PC'] }
		];
		for (const unit of pcBand2) {
			const res = await db.collection('org_units').insertOne({
				code: unit.code,
				name: unit.name,
				shortName: unit.code,
				type: 'department',
				organizationId: iasId,
				parentId: unit.parentId,
				level: 3,
				sortOrder: 603,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			unitMap[unit.code] = res.insertedId;
		}

		const totalUnits = Object.keys(unitMap).length;
		console.log(`✅ Created ${totalUnits} organizational units`);

		// ============== Positions ==============
		console.log('💼 Creating positions (Band 1 = Group Head, Band 2 = Division Head)...');

		const positions: Partial<Position>[] = [
			// Executive
			{ code: 'DIR', name: 'Direktur', level: 'executive', grade: 'E1', organizationId: iasId },
			{ code: 'DIRUT', name: 'Direktur Utama', level: 'executive', grade: 'E0', organizationId: iasId },

			// Band 1 (Group Head)
			{ code: 'GH', name: 'Group Head', level: 'senior', grade: 'B1', organizationId: iasId },
			{ code: 'GM', name: 'General Manager', level: 'senior', grade: 'B1', organizationId: iasId },

			// Band 2 (Division Head)
			{ code: 'DH', name: 'Division Head', level: 'middle', grade: 'B2', organizationId: iasId },
			{ code: 'MGR', name: 'Manager', level: 'middle', grade: 'B2', organizationId: iasId },

			// Staff levels
			{ code: 'SPV', name: 'Supervisor', level: 'junior', grade: 'J1', organizationId: iasId },
			{ code: 'SSTA', name: 'Senior Staff', level: 'junior', grade: 'J2', organizationId: iasId },
			{ code: 'STA', name: 'Staff', level: 'staff', grade: 'S1', organizationId: iasId },
			{ code: 'JSTA', name: 'Junior Staff', level: 'staff', grade: 'S2', organizationId: iasId },
		];

		const positionResults = await db.collection('positions').insertMany(positions);
		const positionIds = Object.values(positionResults.insertedIds).map(id => id.toString());
		const positionMap = {
			'DIRUT': positionIds[1],
			'DIR': positionIds[0],
			'GH': positionIds[2],
			'GM': positionIds[3],
			'DH': positionIds[4],
			'MGR': positionIds[5],
			'SPV': positionIds[6],
			'SSTA': positionIds[7],
			'STA': positionIds[8],
			'JSTA': positionIds[9]
		};

		console.log(`✅ Created ${positions.length} positions`);

		// ============== COMPREHENSIVE EMPLOYEES (200+) ==============
		console.log('👥 Creating 200+ employees across all units...');

		const hashedPassword = await hash('password123');
		const employees: Partial<Employee>[] = [];
		const users: Partial<User>[] = [];
		let employeeCounter = 1;

		// Admin user + employee
		const adminName = generateName('male');
		const adminUser: Partial<User> = {
			email: 'admin@ias.co.id',
			username: 'admin',
			password: hashedPassword,
			firstName: adminName.firstName,
			lastName: adminName.lastName,
			isActive: true,
			emailVerified: true,
			roles: ['admin', 'user'],
			organizationId: iasId,
			employeeId: 'IAS-0001',
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		const adminUserResult = await db.collection('users').insertOne(adminUser);

		employees.push({
			employeeId: 'IAS-0001',
			userId: adminUserResult.insertedId.toString(),
			organizationId: iasId,
			orgUnitId: unitMap['DU'].toString(),
			positionId: positionMap['DIRUT'],
			firstName: adminName.firstName,
			lastName: adminName.lastName,
			fullName: adminName.fullName,
			email: 'admin@ias.co.id',
			phone: generatePhone(),
			gender: 'male',
			dateOfBirth: randomDate(new Date('1970-01-01'), new Date('1980-12-31')),
			employmentType: 'permanent',
			employmentStatus: 'active',
			joinDate: new Date('2015-01-01'),
			workLocation: 'Jakarta',
			region: 'Pusat',
			customProperties: { employmentType: 'Permanent', position: 'Direktur Utama' },
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		employeeCounter++;

		// Directors (5 more)
		const directorUnits = ['DC', 'DO', 'DR', 'DK', 'DH'];
		for (const unitCode of directorUnits) {
			const gender = Math.random() > 0.5 ? 'male' : 'female';
			const name = generateName(gender);
			const empId = `IAS-${String(employeeCounter).padStart(4, '0')}`;

			employees.push({
				employeeId: empId,
				organizationId: iasId,
				orgUnitId: unitMap[unitCode].toString(),
				positionId: positionMap['DIR'],
				firstName: name.firstName,
				lastName: name.lastName,
				fullName: name.fullName,
				email: generateEmail(name.firstName, name.lastName),
				phone: generatePhone(),
				gender,
				dateOfBirth: randomDate(new Date('1970-01-01'), new Date('1980-12-31')),
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: randomDate(new Date('2015-01-01'), new Date('2020-01-01')),
				workLocation: 'Jakarta',
				region: 'Pusat',
				customProperties: { employmentType: 'Permanent', position: 'Direktur' },
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			employeeCounter++;
		}

		// Band 1 employees (Group Heads) - one for each band 1 unit
		const band1Units = ['IA', 'CS', 'CST', 'CD', 'SSM', 'BPS', 'SCS', 'LOG', 'CBE', 'CLS',
			'OPS', 'CX', 'BP', 'CF', 'SPM', 'ACC', 'HS', 'HB', 'HG', 'IT', 'RM', 'LG', 'PC'];

		for (const unitCode of band1Units) {
			const gender = Math.random() > 0.5 ? 'male' : 'female';
			const name = generateName(gender);
			const empId = `IAS-${String(employeeCounter).padStart(4, '0')}`;

			employees.push({
				employeeId: empId,
				organizationId: iasId,
				orgUnitId: unitMap[unitCode].toString(),
				positionId: positionMap['GH'],
				firstName: name.firstName,
				lastName: name.lastName,
				fullName: name.fullName,
				email: generateEmail(name.firstName, name.lastName),
				phone: generatePhone(),
				gender,
				dateOfBirth: randomDate(new Date('1975-01-01'), new Date('1985-12-31')),
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: randomDate(new Date('2016-01-01'), new Date('2021-01-01')),
				workLocation: 'Jakarta',
				region: 'Pusat',
				customProperties: { employmentType: 'Permanent', position: 'Group Head' },
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			employeeCounter++;
		}

		// Band 2 employees (Division Heads) - one for each band 2 unit
		const band2Units = ['BOA', 'FEA', 'BSCA', 'CCSR', 'CORSUS', 'CPD', 'CORT', 'CDBD', 'CDCP',
			'SMMC', 'SMIS', 'BPPS', 'BPAM', 'GMCS', 'GMCO', 'GMAE', 'GMFF', 'GMBSS', 'GMCL',
			'PQ', 'KS', 'BIP', 'PO', 'SAF', 'SHL', 'SFS', 'OPOS', 'OPQA', 'OPHSE', 'CXPP', 'CXD', 'CXIC',
			'BPT', 'BPMO', 'CFM', 'CFF', 'CFT', 'CFSF', 'CFPC', 'CFSP', 'CFAT', 'CFFR',
			'HCOC', 'HCPPE', 'HCBP', 'HCTD', 'HCS', 'HCI', 'HCGA', 'ITSI', 'ITDV', 'ITOI', 'ITCG',
			'RMCG', 'RMCA', 'RMSD', 'RMAM', 'CLG', 'BLG', 'LGA', 'PCP', 'PCOV'];

		for (const unitCode of band2Units) {
			if (!unitMap[unitCode]) continue;
			const gender = Math.random() > 0.5 ? 'male' : 'female';
			const name = generateName(gender);
			const empId = `IAS-${String(employeeCounter).padStart(4, '0')}`;

			employees.push({
				employeeId: empId,
				organizationId: iasId,
				orgUnitId: unitMap[unitCode].toString(),
				positionId: positionMap['DH'],
				firstName: name.firstName,
				lastName: name.lastName,
				fullName: name.fullName,
				email: generateEmail(name.firstName, name.lastName),
				phone: generatePhone(),
				gender,
				dateOfBirth: randomDate(new Date('1980-01-01'), new Date('1990-12-31')),
				employmentType: 'permanent',
				employmentStatus: 'active',
				joinDate: randomDate(new Date('2017-01-01'), new Date('2022-01-01')),
				workLocation: 'Jakarta',
				region: 'Pusat',
				customProperties: { employmentType: 'Permanent', position: 'Division Head' },
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			employeeCounter++;
		}

		// Staff employees - distribute across all units (120+ more)
		const allUnitsForStaff = [...band1Units, ...band2Units, 'CGSL', 'CI', 'RA', 'KNO', 'CGK', 'DPS', 'UPG',
			'AESL', 'AEOP', 'AEPC', 'FFSL', 'FFOP', 'FFPC', 'BSSSL', 'BSSOP', 'CLSL', 'CLOP', 'CLDS'];

		const employmentTypes = ['permanent', 'PKWT', 'OS'];
		const staffPositions = ['SPV', 'SSTA', 'STA', 'JSTA'];

		// Generate 2-5 staff per unit
		for (const unitCode of allUnitsForStaff) {
			if (!unitMap[unitCode]) continue;
			const numStaff = Math.floor(Math.random() * 4) + 2; // 2-5 staff

			for (let i = 0; i < numStaff; i++) {
				const gender = Math.random() > 0.5 ? 'male' : 'female';
				const name = generateName(gender);
				const empId = `IAS-${String(employeeCounter).padStart(4, '0')}`;
				const empType = employmentTypes[Math.floor(Math.random() * employmentTypes.length)];
				const position = staffPositions[Math.floor(Math.random() * staffPositions.length)];
				const joinDate = randomDate(new Date('2018-01-01'), new Date('2024-12-31'));

				const employeeData: Partial<Employee> = {
					employeeId: empId,
					organizationId: iasId,
					orgUnitId: unitMap[unitCode].toString(),
					positionId: positionMap[position],
					firstName: name.firstName,
					lastName: name.lastName,
					fullName: name.fullName,
					email: generateEmail(name.firstName, name.lastName),
					phone: generatePhone(),
					gender,
					dateOfBirth: randomDate(new Date('1985-01-01'), new Date('2000-12-31')),
					employmentType: empType,
					employmentStatus: 'active',
					joinDate,
					workLocation: ['Jakarta', 'CGK', 'KNO', 'DPS', 'UPG'][Math.floor(Math.random() * 5)],
					region: ['Pusat', 'Regional 1', 'Regional 2', 'Regional 3', 'Regional 4'][Math.floor(Math.random() * 5)],
					customProperties: { employmentType: empType },
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				if (empType === 'PKWT') {
					employeeData.endDate = new Date(joinDate.getTime() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years
					employeeData.customProperties!.contractEndDate = employeeData.endDate.toISOString();
				} else if (empType === 'OS') {
					employeeData.customProperties!.vendor = 'PT Outsourcing Partner';
				}

				employees.push(employeeData);
				employeeCounter++;
			}
		}

		console.log(`✅ Generated ${employees.length} employees`);

		await db.collection('employees').insertMany(employees);

		console.log(`✅ Inserted ${employees.length} employees into database`);

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
		];

		await db.collection('oauth_clients').insertMany(clients);
		console.log(`✅ Created ${clients.length} OAuth clients`);

		// ============== Create Organization Structure Version ==============
		console.log('📋 Creating organization structure version...');

		// Fetch all org units for snapshot
		const allOrgUnits = await db.collection('org_units').find({ organizationId: iasId }).toArray();
		const allPositions = await db.collection('positions').find({ organizationId: iasId }).toArray();

		const orgStructureSnapshot = {
			orgUnits: allOrgUnits.map(unit => ({
				_id: unit._id.toString(),
				code: unit.code,
				name: unit.name,
				parentId: unit.parentId ? unit.parentId.toString() : undefined,
				type: unit.type,
				level: unit.level,
				sortOrder: unit.sortOrder,
				headEmployeeId: undefined
			})),
			positions: allPositions.map(pos => ({
				_id: pos._id.toString(),
				code: pos.code,
				name: pos.name,
				level: pos.level,
				grade: pos.grade || '',
				reportingToPositionId: undefined
			}))
		};

		// Generate Mermaid diagram
		const mermaidDiagram = generateMermaidDiagram(orgStructureSnapshot.orgUnits);

		const orgVersion: Partial<OrgStructureVersion> = {
			versionNumber: 1,
			versionName: '2025 Enhanced Structure - Complete IAS Organization',
			organizationId: iasId,
			effectiveDate: new Date('2025-01-01'),
			status: 'active',
			structure: orgStructureSnapshot,
			changes: [{
				type: 'unit_added',
				entityType: 'org_unit',
				entityId: 'INITIAL',
				entityName: 'Initial Structure',
				description: 'Complete IAS organizational structure with all directorates, divisions, and departments'
			}],
			skNumber: 'SK-001/IAS/ORG/2025',
			skDate: new Date('2024-12-15'),
			skSignedBy: 'IAS-0001',
			reassignments: [],
			mermaidDiagram,
			createdBy: adminUserResult.insertedId.toString(),
			notes: 'Initial comprehensive organizational structure based on IAS operational model',
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await db.collection('org_structure_versions').insertOne(orgVersion);
		console.log('✅ Created organization structure version 1');

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

		console.log('\n✨ ENHANCED SEEDING COMPLETED SUCCESSFULLY!');
		console.log('\n📊 Summary:');
		console.log(`   Organizations: ${1 + injSiblings.length + 1 + subsidiaries.length}`);
		console.log(`   Organizational Units: ${totalUnits}`);
		console.log(`   Positions: ${positions.length}`);
		console.log(`   Employees: ${employees.length}`);
		console.log(`   Partners: ${partners.length}`);
		console.log(`   OAuth Clients: ${clients.length}`);
		console.log(`   Organization Structure Versions: 1`);
		console.log('\n🔑 Login credentials:');
		console.log('   Email: admin@ias.co.id');
		console.log('   Password: password123');

	} catch (error) {
		console.error('❌ Seeding failed:', error);
		throw error;
	} finally {
		await disconnectDB();
	}
}

// Run seed if called directly
if (import.meta.main) {
	seedEnhanced().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

export { seedEnhanced };
