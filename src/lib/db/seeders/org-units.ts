import type { Db } from 'mongodb';

/**
 * Seed organizational units with complete IAS structure
 */
export async function seedOrgUnits(db: Db, iasId: string, options: { clear?: boolean } = {}) {
	console.log('🏢 Seeding organizational units...');

	if (options.clear) {
		await db.collection('org_units').deleteMany({});
	}

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

	// Level 1: Directors
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

	// Level 2: Under Direktur Utama - DDB
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

	// Level 3: Under DDB
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

	// Level 2: SBU Cargo & Logistics
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

	// Level 3: Under SBUCL
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

	// Level 4: Under Cargo Service
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

	// Regional stations
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

	// Level 4: Under Logistics
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

	// Level 4: Under CBE
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

	// Level 4: Under CLS
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
	console.log(`✅ Created ${totalUnits} organizational units`);

	return unitMap;
}
