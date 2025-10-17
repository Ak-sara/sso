import type { Db } from 'mongodb';
import type { Organization } from '../schemas';

/**
 * Seed organizations including MASTER system organization with branding
 */
export async function seedOrganizations(db: Db, options: { clear?: boolean } = {}) {
	console.log('📦 Seeding organizations...');

	if (options.clear) {
		await db.collection('organizations').deleteMany({});
	}

	// Create MASTER system organization with IAS branding
	const master: Partial<Organization> = {
		code: 'MASTER',
		name: 'Aksara SSO',
		legalName: 'Aksara SSO System',
		type: 'system',
		isActive: true,
		branding: {
			appName: 'IAS SSO',
			logoBase64: '/ias-logo.png',
			primaryColor: '#339999', // Teal
			secondaryColor: '#4fc3c6', // Cyan
			accentColor: '#9fbc39', // Green
			backgroundColor: '#f9fafb',
			textColor: '#ffffff',
			emailFromName: 'IAS SSO',
			emailFromAddress: 'no-reply@ias.co.id',
			supportEmail: 'support@ias.co.id',
		},
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	await db.collection('organizations').insertOne(master);

	// Injourney (parent company)
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

	// IAS (main operating company)
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

	console.log(`✅ Created ${1 + 1 + 1 + subsidiaries.length} organizations (including MASTER)`);

	return {
		masterOrg: master,
		injId,
		iasId,
		subsidiaryIds,
	};
}
